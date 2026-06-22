sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/Label",
	"sap/m/Text",
	"downport/util/BlockActions"
], function (Controller, Label, Text, BlockActions) {
	"use strict";

	var ENTITY = "/Products";
	var FIELD_GROUP = ENTITY + "/@com.sap.vocabularies.UI.v1.FieldGroup#Stock";
	var LABEL = "@com.sap.vocabularies.Common.v1.Label";

	return Controller.extend("downport.blocks.stockpricing.StockPricing", {

		onInit: function () {
			this.getView().addEventDelegate({ onBeforeRendering: this._build }, this);
		},

		_build: function () {
			if (this._bBuilt) {
				return;
			}
			var oContext = this.getView().getBindingContext();
			if (!oContext) {
				return;
			}
			this._bBuilt = true;

			var oMeta = this.getView().getModel().getMetaModel();
			var oForm = this.byId("form");
			// Full FieldGroup collection: DataField -> fields, DataFieldForAction -> buttons.
			var aAll = ((oMeta.getObject(FIELD_GROUP) || {}).Data) || [];
			var aData = aAll.filter(function (oData) {
				return oData.$Type === "com.sap.vocabularies.UI.v1.DataField" && oData.Value && oData.Value.$Path;
			});

			// Dedicated $select binding -> the deferred GET fires here, on tab open.
			// Bind BEFORE adding the value Texts so they resolve against this section's
			// own context from the start (avoids transient "invalid segment" drill-down
			// errors against the header-only view context).
			oForm.bindElement({
				path: oContext.getPath(),
				parameters: { $select: aData.map(function (oData) { return oData.Value.$Path; }).join(",") }
			});

			aData.forEach(function (oData) {
				var sPath = oData.Value.$Path;
				var sLabel = oMeta.getObject(ENTITY + "/" + sPath + LABEL) || sPath;
				oForm.addContent(new Label({ text: sLabel }));
				oForm.addContent(new Text({ text: "{" + sPath + "}" }));
			});

			this._buildActions(aAll, oContext);
		},

		// One button per UI.DataFieldForAction in FieldGroup#Stock, each routed
		// through util/AsyncActionRunner (trigger + poll).
		_buildActions: function (aAll, oContext) {
			var aButtons = BlockActions.buildButtons(aAll, { context: oContext });
			if (!aButtons.length) {
				return;
			}
			var oToolbar = this.byId("actions");
			aButtons.forEach(function (oButton) { oToolbar.addContent(oButton); });
			oToolbar.setVisible(true);
		}
	});
});
