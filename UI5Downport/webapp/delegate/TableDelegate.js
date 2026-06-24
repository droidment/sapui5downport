sap.ui.define([
	"sap/ui/mdc/odata/v4/TableDelegate",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"downport/util/MetadataDriven"
], function (ODataV4TableDelegate, Filter, FilterOperator, MetadataDriven) {
	"use strict";

	// "In WIP" maps to products with units currently on order (work in progress).
	// Change this single condition to repoint the custom switch at a different field.
	var WIP_FILTER = new Filter("UnitsOnOrder", FilterOperator.GT, 0);

	// Delegate for the sap.ui.mdc.Table that lists Northwind V4 Products.
	// Extends the stock OData V4 TableDelegate so it inherits the V4 binding
	// mechanics (filter/sort translation from the linked FilterBar's conditions,
	// $count, $select from visible columns). fetchProperties is derived from
	// $metadata + Common.Label annotations (see util/MetadataDriven) instead of a
	// hard-coded list — so every Product property is available and the UI.LineItem
	// annotation alone decides which become columns.
	var Delegate = Object.assign({}, ODataV4TableDelegate);

	Delegate.fetchProperties = function (oTable) {
		var oPayload = oTable.getPayload && oTable.getPayload();
		var sEntity = (oPayload && oPayload.collectionPath) || "/Products";
		return MetadataDriven.fetchTableProperties(oTable, sEntity);
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
