sap.ui.define([
	"sap/ui/mdc/FilterBarDelegate"
], function (FilterBarDelegate) {
	"use strict";

	// Delegate for the main sap.ui.mdc.FilterBar. The FilterFields are declared
	// statically in the view, so the only required hook is fetchProperties, which
	// supplies the property metadata (type/operators) MDC needs to build the
	// condition model and run the filters. Names match each FilterField's
	// propertyKey and the Northwind V4 Product entity.
	var Delegate = Object.assign({}, FilterBarDelegate);

	Delegate.fetchProperties = function () {
		return Promise.resolve([
			{ name: "ProductName", path: "ProductName", label: "Product Name", dataType: "sap.ui.model.odata.type.String", maxConditions: -1 },
			{ name: "CategoryID", path: "CategoryID", label: "Category", dataType: "sap.ui.model.odata.type.Int32", maxConditions: -1 },
			{ name: "SupplierID", path: "SupplierID", label: "Supplier", dataType: "sap.ui.model.odata.type.Int32", maxConditions: -1 }
		]);
	};

	return Delegate;
});
