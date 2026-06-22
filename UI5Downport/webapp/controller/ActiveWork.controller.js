sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("downport.controller.ActiveWork", {
		onNavBack: function () {
			this.getOwnerComponent().getRouter().navTo("main");
		},

		onProductPress: function (oEvent) {
			var oContext = oEvent.getParameter("bindingContext");
			if (!oContext) { return; }
			var aMatch = /\(([^)]+)\)/.exec(oContext.getPath());
			if (aMatch) {
				this.getOwnerComponent().getRouter().navTo("object", { productId: aMatch[1] });
			}
		}
	});
});
