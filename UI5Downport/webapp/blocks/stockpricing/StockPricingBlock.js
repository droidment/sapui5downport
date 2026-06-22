sap.ui.define([
	"sap/uxap/BlockBase"
], function (BlockBase) {
	"use strict";

	// BlockBase block for the "Stock & Pricing" section. Its view is created only
	// when the user opens this tab, at which point the controller builds the form and
	// fires the deferred GET for the stock/pricing properties.
	return BlockBase.extend("downport.blocks.stockpricing.StockPricingBlock", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "downport.blocks.stockpricing.StockPricing",
					type: "XML"
				},
				Expanded: {
					viewName: "downport.blocks.stockpricing.StockPricing",
					type: "XML"
				}
			}
		}
	});
});
