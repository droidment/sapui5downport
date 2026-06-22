"use strict";

// =====================================================================
// odataProxy — production replacement for server.py's reverse proxy.
//
// Firebase Hosting is static-only and its rewrites cannot target an
// arbitrary external URL, so the same-origin /odata/* proxy that the dev
// server provided is reimplemented here as an HTTPS Cloud Function and
// wired via a hosting rewrite (firebase.json: /odata/** -> odataProxy).
//
// It does exactly what server.py's _proxy did, and for the same reasons:
//   1. Sidesteps CORS — the browser talks to /odata on its OWN origin
//      (the hosting domain); this function makes the cross-origin hop to
//      Northwind server-side, so the V4 model's OData-Version /
//      OData-MaxVersion / metadata headers never trigger a preflight the
//      public Northwind service would reject.
//   2. Normalizes the malformed "OData-Version: 4.0;" (trailing semicolon)
//      the service emits, which UI5's strict doCheckVersionHeader rejects.
// =====================================================================

const { onRequest } = require("firebase-functions/v2/https");

const UPSTREAM = "https://services.odata.org";
const PREFIX = "/odata";

// Hop-by-hop / origin-revealing request headers we must not forward upstream
// (mirrors server.py DROP_REQUEST, plus GCP/Cloud Run injected headers).
const DROP_REQUEST = new Set([
	"connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
	"te", "trailers", "transfer-encoding", "upgrade", "host",
	"accept-encoding", "content-length", "origin", "referer",
	"x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "forwarded",
	"x-cloud-trace-context", "x-appengine-user-ip", "function-execution-id",
	"traceparent"
]);

// Response headers we must not copy back (mirrors server.py DROP_RESPONSE).
// content-encoding/length are dropped because fetch() already decoded the body
// and res.end(buffer) sets a correct Content-Length itself.
const DROP_RESPONSE = new Set([
	"connection", "keep-alive", "transfer-encoding", "upgrade",
	"content-encoding", "content-length"
]);

exports.odataProxy = onRequest(
	{ region: "us-central1", timeoutSeconds: 60, memory: "256MiB" },
	async (req, res) => {
		// With the hosting rewrite the original path+query is preserved,
		// e.g. "/odata/V4/Northwind/Northwind.svc/Products?$count=true&...".
		const url = req.url || "";
		const i = url.indexOf(PREFIX);
		if (i === -1) {
			res.status(404).send("Not an /odata path");
			return;
		}
		const upstreamUrl = UPSTREAM + url.slice(i + PREFIX.length);

		const headers = {};
		for (const [k, v] of Object.entries(req.headers)) {
			if (typeof v === "string" && !DROP_REQUEST.has(k.toLowerCase())) {
				headers[k] = v;
			}
		}

		const method = (req.method || "GET").toUpperCase();
		const init = { method, headers, redirect: "follow" };
		if (method !== "GET" && method !== "HEAD" && req.rawBody && req.rawBody.length) {
			init.body = req.rawBody;
		}

		try {
			const upstream = await fetch(upstreamUrl, init);
			const buf = Buffer.from(await upstream.arrayBuffer());
			res.status(upstream.status);
			upstream.headers.forEach((value, key) => {
				const lk = key.toLowerCase();
				if (DROP_RESPONSE.has(lk) || lk === "cache-control") { return; }
				let out = value;
				if (lk === "odata-version") {
					out = value.trim().replace(/;+\s*$/, "").trim();
				}
				res.setHeader(key, out);
			});
			// Live OData passthrough: never let the browser cache responses (or
			// transient errors). Mirrors the dev server's no-store behavior and
			// avoids stale-data / cached-404 surprises.
			res.setHeader("Cache-Control", "no-store");
			if (method === "HEAD") { res.end(); } else { res.end(buf); }
		} catch (e) {
			res.status(502).send("Proxy error: " + (e && e.message ? e.message : String(e)));
		}
	}
);
