sap.ui.define([
	"sap/ui/mdc/odata/v4/TableDelegate",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (ODataV4TableDelegate, Filter, FilterOperator) {
	"use strict";

	// "In WIP" maps to products with units currently on order (work in progress).
	// Change this single condition to repoint the custom switch at a different field.
	var WIP_FILTER = new Filter("UnitsOnOrder", FilterOperator.GT, 0);

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
		// Super first: this is where the linked FilterBar's conditions become
		// oBindingInfo.filters ($filter). We then AND-in the custom switch.
		ODataV4TableDelegate.updateBindingInfo.apply(this, arguments);

		// Custom "In WIP" switch: state lives in the view's "ui" JSON model.
		// When on, append the WIP condition so it joins the $filter query.
		var oUIModel = oTable.getModel("ui");
		if (oUIModel && oUIModel.getProperty("/inWIP")) {
			var aFilters = oBindingInfo.filters ? [].concat(oBindingInfo.filters) : [];
			aFilters.push(WIP_FILTER);
			oBindingInfo.filters = aFilters;
		}

		oBindingInfo.parameters = oBindingInfo.parameters || {};
		if (!("$count" in oBindingInfo.parameters)) {
			oBindingInfo.parameters.$count = true;
		}
	};

	return Delegate;
});
