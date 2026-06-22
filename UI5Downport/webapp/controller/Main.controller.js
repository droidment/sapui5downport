sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	// No view-state model needed: the MDC FilterBar owns the filter conditions and
	// the MDC Table binds straight to the live OData V4 Northwind model (the default
	// unnamed model from manifest.json). The FilterFields' ValueHelps also read from
	// that same model (/Products, /Categories, /Suppliers).
	return Controller.extend("downport.controller.Main", {
		onInit: function () {},

		// Row tap on the MDC Table -> navigate to the annotation-driven Object Page.
		// MDC Table's rowPress event hands us the row's binding context; we pull the
		// ProductID key out of the V4 context path "/Products(<id>)" and pass it as the
		// route parameter.
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
		}
	});
});
