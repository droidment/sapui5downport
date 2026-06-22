sap.ui.define([
	"sap/ui/mdc/odata/v4/TableDelegate"
], function (ODataV4TableDelegate) {
	"use strict";

	// Delegate for the sap.ui.mdc.Table that lists Northwind V4 Products.
	// Extends the stock OData V4 TableDelegate so it inherits the V4 binding
	// mechanics (filter/sort translation from the linked FilterBar's conditions,
	// $count, $select from visible columns). We only override fetchProperties to
	// declare the Product entity properties explicitly (instead of deriving them
	// from $metadata) and pin the collection path.
	var Delegate = Object.assign({}, ODataV4TableDelegate);

	Delegate.fetchProperties = function () {
		return Promise.resolve([
			{ name: "ProductID", path: "ProductID", label: "ID", dataType: "sap.ui.model.odata.type.Int32", key: true, sortable: true, filterable: true },
			{ name: "ProductName", path: "ProductName", label: "Product Name", dataType: "sap.ui.model.odata.type.String", sortable: true, filterable: true },
			{ name: "QuantityPerUnit", path: "QuantityPerUnit", label: "Qty per Unit", dataType: "sap.ui.model.odata.type.String", sortable: true, filterable: true },
			{ name: "UnitPrice", path: "UnitPrice", label: "Unit Price", dataType: "sap.ui.model.odata.type.Decimal", sortable: true, filterable: true },
			{ name: "UnitsInStock", path: "UnitsInStock", label: "Units In Stock", dataType: "sap.ui.model.odata.type.Int16", sortable: true, filterable: true },
			{ name: "CategoryID", path: "CategoryID", label: "Category", dataType: "sap.ui.model.odata.type.Int32", sortable: true, filterable: true },
			{ name: "SupplierID", path: "SupplierID", label: "Supplier", dataType: "sap.ui.model.odata.type.Int32", sortable: true, filterable: true }
		]);
	};

	Delegate.updateBindingInfo = function (oTable, oBindingInfo) {
		var oPayload = oTable.getPayload && oTable.getPayload();
		oBindingInfo.path = (oPayload && oPayload.collectionPath) || "/Products";
		ODataV4TableDelegate.updateBindingInfo.apply(this, arguments);
		oBindingInfo.parameters = oBindingInfo.parameters || {};
		if (!("$count" in oBindingInfo.parameters)) {
			oBindingInfo.parameters.$count = true;
		}
	};

	return Delegate;
});
