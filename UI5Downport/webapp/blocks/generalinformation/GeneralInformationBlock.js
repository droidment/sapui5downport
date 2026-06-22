sap.ui.define([
	"sap/uxap/BlockBase"
], function (BlockBase) {
	"use strict";

	// A sap.uxap.BlockBase block for the "General Information" Object Page section.
	// The BlockBase only instantiates its inner view when the section is about to be
	// displayed; with useIconTabBar that is on tab selection (for the first/default
	// tab, immediately). The view's controller then builds its annotation-driven
	// content and issues this section's OData request — so data loads lazily, per
	// section, the freestyle equivalent of a Fiori Elements lazy block.
	return BlockBase.extend("downport.blocks.generalinformation.GeneralInformationBlock", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "downport.blocks.generalinformation.GeneralInformation",
					type: "XML"
				},
				Expanded: {
					viewName: "downport.blocks.generalinformation.GeneralInformation",
					type: "XML"
				}
			}
		}
	});
});
