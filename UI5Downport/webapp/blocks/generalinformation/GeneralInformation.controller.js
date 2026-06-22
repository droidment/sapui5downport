sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/Label",
	"sap/m/Text"
], function (Controller, Label, Text) {
	"use strict";

	// This section's annotation source. Everything (which fields, their labels) is
	// read from the OData V4 metamodel; nothing about the fields is hard-coded.
	var ENTITY = "/Products";
	var FIELD_GROUP = ENTITY + "/@com.sap.vocabularies.UI.v1.FieldGroup#General";
	var LABEL = "@com.sap.vocabularies.Common.v1.Label";

	return Controller.extend("downport.blocks.generalinformation.GeneralInformation", {

		onInit: function () {
			// onBeforeRendering fires after the product binding context has propagated
			// into this (lazily created) block view, which is exactly when we want to
			// build the form and fire this section's request.
			this.getView().addEventDelegate({ onBeforeRendering: this._build }, this);
		},

		_build: function () {
			if (this._bBuilt) {
				return;
			}
			var oContext = this.getView().getBindingContext();
			if (!oContext) {
				return; // context not propagated yet; a later rendering pass will build
			}
			this._bBuilt = true;

			var oMeta = this.getView().getModel().getMetaModel();
			var oForm = this.byId("form");
			var aData = (((oMeta.getObject(FIELD_GROUP) || {}).Data) || []).filter(function (oData) {
				return oData.$Type === "com.sap.vocabularies.UI.v1.DataField" && oData.Value && oData.Value.$Path;
			});

			// Own element binding with a $select of just this section's fields. Because
			// the model has no autoExpandSelect (so non-selected properties never
			// auto-load), this dedicated binding is what issues the deferred
			// GET /Products(id)?$select=<this section's fields> when the block renders.
			// Bind BEFORE adding the value Texts so they resolve against this section's
			// own context from the start, never transiently drilling into the
			// header-only view context (which would log "invalid segment" errors).
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
		}
	});
});
