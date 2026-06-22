#!/usr/bin/env python3
"""Dev server for the UI5 1.120 downport app.

Serves the static app from webapp/ AND reverse-proxies the OData V4 service so the
browser talks to it same-origin. This is needed because the public Northwind V4
service at services.odata.org answers *simple* GETs but rejects the CORS preflight
triggered by the OData-Version / OData-MaxVersion / odata.metadata headers that
sap.ui.model.odata.v4.ODataModel always sends. Routing through this proxy makes the
requests same-origin (no CORS at all) while keeping a genuine live OData V4 backend.

    /odata/<path>  ->  https://services.odata.org/<path>
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import os
import sys

PORT = 8181
BASE = os.path.dirname(os.path.abspath(__file__))
WEBROOT = os.path.join(BASE, "webapp")
PROXY_PREFIX = "/odata"
UPSTREAM = "https://services.odata.org"

# Headers we must not copy verbatim between hops.
DROP_REQUEST = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host",
    "accept-encoding", "content-length", "origin", "referer",
}
DROP_RESPONSE = {
    "connection", "keep-alive", "transfer-encoding", "upgrade",
    "content-encoding", "content-length",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEBROOT, **kwargs)

    def _proxy(self, method):
        upstream_url = UPSTREAM + self.path[len(PROXY_PREFIX):]
        length = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(upstream_url, data=body, method=method)
        for k, v in self.headers.items():
            if k.lower() not in DROP_REQUEST:
                req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() in DROP_RESPONSE:
                        continue
                    # The public Northwind V4 service emits a malformed
                    # "OData-Version: 4.0;" (trailing semicolon) that UI5's strict
                    # doCheckVersionHeader rejects. Normalize it to a clean "4.0".
                    if k.lower() == "odata-version":
                        v = v.strip().rstrip(";").strip()
                    self.send_header(k, v)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if method != "HEAD":
                    self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "text/plain"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if method != "HEAD":
                self.wfile.write(data)
        except Exception as e:
            self.send_error(502, "Proxy error: %s" % e)

    def do_GET(self):
        if self.path.startswith(PROXY_PREFIX):
            self._proxy("GET")
        else:
            super().do_GET()

    def do_HEAD(self):
        if self.path.startswith(PROXY_PREFIX):
            self._proxy("HEAD")
        else:
            super().do_HEAD()

    def do_POST(self):
        if self.path.startswith(PROXY_PREFIX):
            self._proxy("POST")
        else:
            self.send_error(501, "Unsupported method POST")


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        sys.stderr.write(
            "Serving %s on http://127.0.0.1:%d  (proxy %s/* -> %s)\n"
            % (WEBROOT, PORT, PROXY_PREFIX, UPSTREAM)
        )
        httpd.serve_forever()
