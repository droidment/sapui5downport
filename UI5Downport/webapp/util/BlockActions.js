sap.ui.define([
	"sap/m/Button",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"downport/util/AsyncActionRunner"
], function (Button, MessageToast, MessageBox, AsyncActionRunner) {
	"use strict";

	var DATA_FIELD_FOR_ACTION = "com.sap.vocabularies.UI.v1.DataFieldForAction";

	// Drive one button press through the AsyncActionRunner seam: disable + busy
	// while it runs, surface poll progress on the tooltip, then a toast on
	// success / MessageBox on failure. Optionally refresh a binding on success.
	function run(oButton, oAction, oOptions) {
		var sLabel = oAction.Label || oAction.Action;
		oButton.setEnabled(false);
		oButton.setBusy(true);

		AsyncActionRunner.run({
			actionId: oAction.Action,
			label: sLabel,
			context: oOptions.context,
			payload: oOptions.payload,
			onProgress: function (sPhase, oInfo) {
				if (sPhase === "polling") {
					oButton.setTooltip(sLabel + "… (" + oInfo.attempt + ")");
				}
			}
		}).then(function (oResult) {
			MessageToast.show(sLabel + " — completed");
			if (typeof oOptions.onSuccess === "function") {
				oOptions.onSuccess(oResult);
			}
		}).catch(function (oErr) {
			MessageBox.error(sLabel + " failed:\n" + ((oErr && oErr.message) || oErr));
		}).then(function () {
			oButton.setBusy(false);
			oButton.setEnabled(true);
			oButton.setTooltip(null);
		});
	}

	return {
		/**
		 * Build one sap.m.Button per UI.DataFieldForAction record found in an
		 * annotation collection (a FieldGroup's Data array or a LineItem array).
		 * Each button routes its press through AsyncActionRunner.
		 *
		 * @param {object[]} aData  the annotation collection (mixed DataField /
		 *        DataFieldForAction records)
		 * @param {object} [oOptions]
		 * @param {sap.ui.model.Context} [oOptions.context]  entity the action targets
		 * @param {object}   [oOptions.payload]     extra data handed to the runner
		 * @param {function} [oOptions.onSuccess]   called with the action result
		 * @returns {sap.m.Button[]} buttons (empty array if no actions annotated)
		 */
		buildButtons: function (aData, oOptions) {
			oOptions = oOptions || {};
			return (aData || []).filter(function (oRec) {
				return oRec.$Type === DATA_FIELD_FOR_ACTION && oRec.Action;
			}).map(function (oAction) {
				var oButton = new Button({
					text: oAction.Label || oAction.Action,
					type: "Emphasized",
					press: function () { run(oButton, oAction, oOptions); }
				});
				return oButton;
			});
		}
	};
});
