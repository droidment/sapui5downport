sap.ui.define([], function () {
	"use strict";

	// =====================================================================
	// AsyncActionRunner — the adapter seam between the UI and YOUR async
	// action backend.
	//
	// The blocks call ONLY AsyncActionRunner.run(...). They never know how an
	// action is triggered or how its progress is polled. To plug in your real
	// runner, replace the bodies of _trigger() and _poll() below (each marked
	// ">>> SEAM"). Everything else — the run() orchestration (progress,
	// interval, timeout) and the button wiring in the blocks — stays as-is.
	//
	// Contract your runner must satisfy after you fill in the seams:
	//   _trigger(o)        -> Promise<{ jobId }>
	//   _poll(jobId, o)    -> Promise<{ status, result, error }>
	//                         status: "running" | "success" | "failed"
	// =====================================================================

	var DEFAULTS = {
		intervalMs: 1200,   // delay between poll attempts while still running
		maxAttempts: 40,    // give up (reject) after this many polls
		timeoutMs: 0        // optional hard wall-clock cap in ms; 0 = rely on maxAttempts
	};

	function wait(ms) {
		return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
	}

	var AsyncActionRunner = {

		/**
		 * Run one async action: trigger it, then poll until it finishes.
		 *
		 * @param {object} o
		 * @param {string}   o.actionId      logical action id (the annotation's Action value)
		 * @param {string}   [o.label]       human label, used in progress/error messages
		 * @param {sap.ui.model.Context} [o.context] the entity/row the action targets
		 * @param {object}   [o.payload]     arbitrary data handed to _trigger
		 * @param {function} [o.onProgress]  called as (phase, info):
		 *     phase = "triggering" | "polling" | "succeeded" | "failed"
		 *     info  = { attempt, maxAttempts, jobId, status, result, error }
		 * @param {object}   [o.options]     { intervalMs, maxAttempts, timeoutMs } overrides
		 * @returns {Promise<object>} resolves with the action result; rejects with an
		 *     Error on action failure or timeout.
		 */
		run: function (o) {
			o = o || {};
			var opt = Object.assign({}, DEFAULTS, o.options || {});
			var fnProgress = o.onProgress || function () {};
			var that = this;
			var iStart = Date.now();

			fnProgress("triggering", { jobId: null });

			return this._trigger(o).then(function (oTrigger) {
				var sJobId = oTrigger && oTrigger.jobId;

				function attempt(n) {
					if (opt.timeoutMs && (Date.now() - iStart) > opt.timeoutMs) {
						return Promise.reject(new Error(
							"Action '" + o.actionId + "' timed out after " + opt.timeoutMs + "ms"));
					}
					if (n > opt.maxAttempts) {
						return Promise.reject(new Error(
							"Action '" + o.actionId + "' did not finish after " + opt.maxAttempts + " polls"));
					}
					return that._poll(sJobId, o).then(function (oStatus) {
						var sStatus = oStatus && oStatus.status;
						fnProgress("polling", {
							attempt: n, maxAttempts: opt.maxAttempts, jobId: sJobId, status: sStatus
						});
						if (sStatus === "success" || sStatus === "succeeded") {
							fnProgress("succeeded", { jobId: sJobId, result: oStatus.result });
							return oStatus.result;
						}
						if (sStatus === "failed" || sStatus === "error") {
							var oErr = new Error((oStatus.error && oStatus.error.message) ||
								("Action '" + o.actionId + "' failed"));
							oErr.detail = oStatus.error;
							fnProgress("failed", { jobId: sJobId, error: oErr });
							throw oErr;
						}
						// still running -> wait, then poll again
						return wait(opt.intervalMs).then(function () { return attempt(n + 1); });
					});
				}

				return attempt(1);
			});
		},

		// ============================================================
		// >>> SEAM: trigger
		// Kick off YOUR action and return a handle to poll on (a job/run id).
		// Must return Promise<{ jobId }>.
		//
		// Real example (same-origin via the dev proxy):
		//   return fetch("/odata/.../CreateOrderAsync", {
		//       method: "POST",
		//       headers: { "Content-Type": "application/json" },
		//       body: JSON.stringify(Object.assign(
		//           { entity: o.context && o.context.getPath() }, o.payload))
		//   }).then(function (r) { return r.json(); })
		//     .then(function (j) { return { jobId: j.runId }; });
		//
		// The stub below fakes a job id so the UI works end-to-end with no
		// backend. DELETE it when you wire the real call above.
		// ============================================================
		_trigger: function (o) {
			return wait(400).then(function () {
				return { jobId: "sim-" + o.actionId + "-" + Date.now() };
			});
		},

		// ============================================================
		// >>> SEAM: poll
		// Check YOUR job's status. Must return
		// Promise<{ status, result, error }> with status one of:
		//   "running" | "success" | "failed".
		//
		// Real example:
		//   return fetch("/odata/.../runs/" + sJobId)
		//     .then(function (r) { return r.json(); })
		//     .then(function (j) {
		//         return { status: j.state, result: j.output, error: j.error };
		//     });
		//
		// The stub fakes ~3 "running" polls then "success". DELETE it when you
		// wire the real call above (and remove the _sim bookkeeping).
		// ============================================================
		_poll: function (sJobId/*, o */) {
			this._sim = this._sim || {};
			var n = (this._sim[sJobId] = (this._sim[sJobId] || 0) + 1);
			return wait(200).then(function () {
				if (n < 3) { return { status: "running" }; }
				return { status: "success", result: { jobId: sJobId, ok: true } };
			});
		}
	};

	return AsyncActionRunner;
});
