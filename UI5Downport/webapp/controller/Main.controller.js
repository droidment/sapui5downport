sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	// No view-state model needed: the MDC FilterBar owns the filter conditions and
	// the MDC Table binds straight to the live OData V4 Northwind model (the default
	// unnamed model from manifest.json). The FilterFields' ValueHelps also read from
	// that same model (/Products, /Categories, /Suppliers).
	return Controller.extend("downport.controller.Main", {
		onInit: function () {}
	});
});
