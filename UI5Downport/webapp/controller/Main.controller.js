sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"downport/annotation/ActionExecutor"
], function (Controller, ActionExecutor) {
	"use strict";

	return Controller.extend("downport.controller.Main", {
		onProductPress: function (oEvent) {
			var oContext = oEvent.getParameter("bindingContext");
			if (!oContext) { return; }
			var aMatch = /\(([^)]+)\)/.exec(oContext.getPath());
			if (aMatch) {
				this.getOwnerComponent().getRouter().navTo("object", { productId: aMatch[1] });
			}
		},

		onAnnotationAction: function (oEvent) {
			return ActionExecutor.execute(oEvent, this.getOwnerComponent());
		}
	});
});
