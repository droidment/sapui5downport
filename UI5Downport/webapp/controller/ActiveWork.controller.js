sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	// Target of the "Active Work" action on the Main page. The Low Stock filter
	// (UnitsInStock < 20) is declared inline on the table's items binding in the
	// view, so this controller only handles navigation: back to Main, and row
	// press through to the annotation-driven Object Page (same route Main uses).
	return Controller.extend("downport.controller.ActiveWork", {

		onNavBack: function () {
			this.getOwnerComponent().getRouter().navTo("main");
		},

		// Row tap -> Object Page. Pull the ProductID key out of the V4 context
		// path "/Products(<id>)", mirroring Main.controller.onProductPress.
		onProductPress: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext();
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
		}
	});
});
