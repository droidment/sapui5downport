sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/base/Log",
	"downport/util/AsyncActionRunner",
	"downport/util/MetadataDriven"
], function (Controller, JSONModel, MessageToast, Log, AsyncActionRunner, MetadataDriven) {
	"use strict";

	var ENTITY = "/Products";

	// The MDC FilterBar owns the standard filter conditions and the MDC Table binds
	// straight to the live OData V4 Northwind model. The page is assembled from
	// annotations the fe.macros way: UI.SelectionFields -> FilterBar fields,
	// UI.LineItem -> table columns + toolbar actions (see util/MetadataDriven). The
	// only extra state we keep is the custom "In WIP" switch, held in a small
	// unnamed-view "ui" JSON model so the TableDelegate can read it on search.
	return Controller.extend("downport.controller.Main", {

		onInit: function () {
			this.getView().setModel(new JSONModel({ inWIP: false }), "ui");
			this._mActionButtons = {};
			// Build on route match, not onInit: at onInit the OData model has not yet
			// propagated to the view, so getModel().getMetaModel() would be undefined.
			// By patternMatched the model is available (same timing the Object Page relies
			// on). Guard so the annotation-driven columns/fields are built only once.
			this.getOwnerComponent().getRouter().getRoute("main")
				.attachPatternMatched(this._onMainMatched, this);
		},

		_onMainMatched: function () {
			if (!this._pBuilt) {
				this._pBuilt = this._buildFromAnnotations();
			}
		},

		// fe.macros-style assembly: read UI.LineItem / UI.SelectionFields and build the
		// table columns (+ toolbar actions) and the FilterBar fields at runtime, then
		// issue the first bind once the columns (and therefore $select) exist.
		_buildFromAnnotations: function () {
			var that = this;
			var oTable = this.byId("productsTable");
			var oFilterBar = this.byId("filterBar");

			// DataFieldForAction Action ids -> handlers. Active Work navigates to the
			// filtered Low Stock view once every selected row's job is done.
			var mPress = {
				"downport.action.ActiveWork": function () { that.onActiveWork(); },
				"downport.action.PassiveWork": function () { that.onPassiveWork(); }
			};

			Promise.all([
				MetadataDriven.buildColumns(oTable, ENTITY, mPress),
				MetadataDriven.buildFilterFields(oFilterBar, ENTITY)
			]).then(function (aResult) {
				that._mActionButtons = aResult[0] || {};
				return oTable.initialized();
			}).then(function () {
				oTable.rebind();
			}).catch(function (oError) {
				Log.error("Failed to build the Main page from annotations", oError);
			});
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
		// Active Work: once the runner finishes for every selected row, navigate to
		// the filtered "Active Work" view (Low Stock products, UnitsInStock < 20).
		onActiveWork: function () {
			var that = this;
			this._runForSelected("downport.action.ActiveWork", "Active Work", function () {
				that.getOwnerComponent().getRouter().navTo("activework");
			});
		},

		onPassiveWork: function () {
			this._runForSelected("downport.action.PassiveWork", "Passive Work");
		},

		// Fire the async runner once per selected row. Each run triggers + polls
		// independently (see util/AsyncActionRunner); we wait for all of them and
		// report a summary. Buttons are disabled while the batch is in flight.
		_runForSelected: function (sActionId, sLabel, fnDone) {
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
				if (typeof fnDone === "function") {
					fnDone(aResults);
				}
			});
		},

		// Enable/disable the annotation-generated toolbar actions (keyed by Action id).
		_setActionsEnabled: function (bEnabled) {
			var mButtons = this._mActionButtons || {};
			Object.keys(mButtons).forEach(function (sId) {
				if (mButtons[sId]) { mButtons[sId].setEnabled(bEnabled); }
			});
		}
	});
});
