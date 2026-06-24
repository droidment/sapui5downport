sap.ui.define([
	"sap/ui/mdc/FilterBarDelegate",
	"downport/util/MetadataDriven"
], function (FilterBarDelegate, MetadataDriven) {
	"use strict";

	// Delegate for the main sap.ui.mdc.FilterBar. The FilterFields themselves are
	// generated at runtime from the Product UI.SelectionFields annotation
	// (Main.controller -> util/MetadataDriven). fetchProperties supplies the property
	// metadata (type/operators) MDC needs to build the condition model — also derived
	// from $metadata + Common.Label rather than hard-coded.
	var Delegate = Object.assign({}, FilterBarDelegate);

	Delegate.fetchProperties = function (oFilterBar) {
		return MetadataDriven.fetchFilterBarProperties(oFilterBar, "/Products");
	};

	return Delegate;
});
