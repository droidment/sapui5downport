sap.ui.define([
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"downport/util/AsyncActionRunner",
	"downport/annotation/ActionConfig"
], function (MessageToast, MessageBox, AsyncActionRunner, ActionConfig) {
	"use strict";

	function refreshSource(oSource) {
		var oBinding = oSource && oSource.getRowBinding && oSource.getRowBinding();
		var oRoot = oBinding && oBinding.getRootBinding && oBinding.getRootBinding();
		if (oRoot && oRoot.refresh) {
			oRoot.refresh();
		}
	}

	function execute(oEvent, oComponent) {
		var sActionId = oEvent.getParameter("actionId");
		var sLabel = oEvent.getParameter("label") || sActionId;
		var oSource = oEvent.getParameter("sourceControl");
		var aContexts = oEvent.getParameter("contexts") || [];
		var oConfig = ActionConfig[sActionId] || {};
		if (oConfig.requiresSelection && !aContexts.length) {
			MessageToast.show("Select one or more rows first.");
			return Promise.resolve([]);
		}
		if (!aContexts.length && oSource && oSource.getBindingContext && oSource.getBindingContext()) {
			aContexts = [oSource.getBindingContext()];
		}
		if (!aContexts.length) {
			MessageToast.show(sLabel + ": no context available.");
			return Promise.resolve([]);
		}
		if (oSource && oSource.setBusy) { oSource.setBusy(true); }
		MessageToast.show(sLabel + ": starting " + aContexts.length + " job(s)...");
		return Promise.all(aContexts.map(function (oContext) {
			return AsyncActionRunner.run({
				actionId: sActionId,
				label: sLabel,
				context: oContext,
				payload: { path: oContext.getPath() }
			}).then(function (oResult) {
				return { ok: true, result: oResult };
			}, function (oError) {
				return { ok: false, error: oError };
			});
		})).then(function (aResults) {
			var iOk = aResults.filter(function (oResult) { return oResult.ok; }).length;
			var iFailed = aResults.length - iOk;
			if (iFailed) {
				MessageBox.error(sLabel + " failed for " + iFailed + " of " + aResults.length + " item(s).");
			} else {
				MessageToast.show(sLabel + " completed: " + iOk + " succeeded");
			}
			if (oConfig.refreshSource) { refreshSource(oSource); }
			if (!iFailed && oConfig.navigateOnSuccess && oComponent) {
				oComponent.getRouter().navTo(oConfig.navigateOnSuccess);
			}
			if (oSource && oSource.clearSelection) { oSource.clearSelection(); }
			return aResults;
		}).finally(function () {
			if (oSource && oSource.setBusy) { oSource.setBusy(false); }
		});
	}

	return { execute: execute };
});
