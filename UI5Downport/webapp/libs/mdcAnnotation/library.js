sap.ui.define([
	"sap/ui/core/Core"
], function (Core) {
	"use strict";

	return Core.initLibrary({
		name: "mdcAnnotation",
		version: "1.0.0",
		dependencies: ["sap.ui.core", "sap.m", "sap.ui.mdc", "sap.ui.layout", "sap.uxap"],
		controls: [
			"mdcAnnotation.AnnotationFilterBar",
			"mdcAnnotation.AnnotationTable",
			"mdcAnnotation.AnnotationObjectPage",
			"mdcAnnotation.SelectionVariantFilter"
		],
		extensions: {
			flChangeHandlers: {
				"mdcAnnotation.AnnotationFilterBar": "sap/ui/mdc/flexibility/FilterBar",
				"mdcAnnotation.AnnotationTable": "sap/ui/mdc/flexibility/Table"
			}
		},
		noLibraryCSS: true
	});
});
