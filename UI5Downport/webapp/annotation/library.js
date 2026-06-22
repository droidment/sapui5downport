sap.ui.define([
	"sap/ui/core/Core"
], function (Core) {
	"use strict";

	return Core.initLibrary({
		name: "downport.annotation",
		version: "1.0.0",
		dependencies: ["sap.ui.core", "sap.m", "sap.ui.mdc", "sap.ui.layout", "sap.uxap"],
		controls: [
			"downport.annotation.AnnotationFilterBar",
			"downport.annotation.AnnotationTable",
			"downport.annotation.AnnotationObjectPage",
			"downport.annotation.SelectionVariantFilter"
		],
		extensions: {
			flChangeHandlers: {
				"downport.annotation.AnnotationFilterBar": "sap/ui/mdc/flexibility/FilterBar",
				"downport.annotation.AnnotationTable": "sap/ui/mdc/flexibility/Table"
			}
		},
		noLibraryCSS: true
	});
});
