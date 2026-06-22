sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"downport/util/AsyncActionRunner"
], function (Controller, JSONModel, MessageToast, AsyncActionRunner) {
	"use strict";

	// The MDC FilterBar owns the standard filter conditions and the MDC Table binds
	// straight to the live OData V4 Northwind model. The only extra state we keep is
	// the custom "In WIP" switch, held in a small unnamed-view "ui" JSON model so the
	// TableDelegate can read it when it assembles the $filter query.
	return Controller.extend("downport.controller.Main", {

		onInit: function () {
			this.getView().setModel(new JSONModel({ inWIP: false }), "ui");
		},

		// Row tap on the MDC Table -> navigate to the annotation-driven Object Page.
		// MDC Table's rowPress hands us the row's binding context; we pull the
		// ProductID key out of the V4 context path "/Products(<id>)".
		onProductPress: function (oEvent) {
			var oContext = oEvent.getParameter("bindingContext");
			if (!oContext) {
				return;
			}
			var aMatch = /\(([^)]+)\)/.exec(oContext.getPath());
			if (!aMatch) {
				return;
			}
			this.getOwnerComponent().getRouter().navTo("object", {
				productId: aMatch[1]
			});
		},

		// Toggling "In WIP" re-runs the FilterBar search so the table rebinds and the
		// TableDelegate picks up the new switch state (see TableDelegate.updateBindingInfo).
		onWIPChange: function () {
			var oFilterBar = this.byId("filterBar");
			if (oFilterBar && oFilterBar.triggerSearch) {
				oFilterBar.triggerSearch();
			}
		},

		// ---- Toolbar actions over the multi-selected rows ------------------------
		onActiveWork: function () {
			this._runForSelected("downport.action.ActiveWork", "Active Work");
		},

		onPassiveWork: function () {
			this._runForSelected("downport.action.PassiveWork", "Passive Work");
		},

		// Fire the async runner once per selected row. Each run triggers + polls
		// independently (see util/AsyncActionRunner); we wait for all of them and
		// report a summary. Buttons are disabled while the batch is in flight.
		_runForSelected: function (sActionId, sLabel) {
			var oTable = this.byId("productsTable");
			var aContexts = oTable.getSelectedContexts();
			if (!aContexts.length) {
				MessageToast.show("Select one or more rows first.");
				return;
			}

			this._setActionsEnabled(false);
			MessageToast.show(sLabel + ": starting " + aContexts.length + " job(s)…");

			var aRuns = aContexts.map(function (oContext) {
				var aMatch = /\(([^)]+)\)/.exec(oContext.getPath());
				return AsyncActionRunner.run({
					actionId: sActionId,
					label: sLabel,
					context: oContext,
					payload: { productId: aMatch && aMatch[1], path: oContext.getPath() }
				}).then(function (oResult) {
					return { ok: true, result: oResult };
				}, function (oError) {
					return { ok: false, error: oError };
				});
			});

			var that = this;
			Promise.all(aRuns).then(function (aResults) {
				var iOk = aResults.filter(function (r) { return r.ok; }).length;
				var iFail = aResults.length - iOk;
				MessageToast.show(sLabel + " done: " + iOk + " succeeded" +
					(iFail ? ", " + iFail + " failed" : ""));
				if (oTable.clearSelection) {
					oTable.clearSelection();
				}
				that._setActionsEnabled(true);
			});
		},

		_setActionsEnabled: function (bEnabled) {
			var oActive = this.byId("btnActiveWork");
			var oPassive = this.byId("btnPassiveWork");
			if (oActive) { oActive.setEnabled(bEnabled); }
			if (oPassive) { oPassive.setEnabled(bEnabled); }
		}
	});
});
