sap.ui.define([
	"sap/ui/mdc/FilterBarDelegate"
], function (FilterBarDelegate) {
	"use strict";

	// Delegate for the value-help dialog FilterBar. In 1.120 this control is
	// sap.ui.mdc.filterbar.vh.FilterBar (relocated to sap.ui.mdc.valuehelp.FilterBar
	// in 1.124). The FilterBar requires a delegate that at minimum implements
	// fetchProperties(). Properties below match the Northwind V4 Product entity.
	var Delegate = Object.assign({}, FilterBarDelegate);

	Delegate.fetchProperties = function (oFilterBar) {
		return Promise.resolve([
			{ name: "ProductName", path: "ProductName", label: "Product Name", dataType: "sap.ui.model.odata.type.String" },
			{ name: "QuantityPerUnit", path: "QuantityPerUnit", label: "Quantity Per Unit", dataType: "sap.ui.model.odata.type.String" },
			{ name: "UnitsInStock", path: "UnitsInStock", label: "Units In Stock", dataType: "sap.ui.model.odata.type.Int16" }
		]);
	};

	return Delegate;
});
