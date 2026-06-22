sap.ui.define([
	"sap/uxap/BlockBase"
], function (BlockBase) {
	"use strict";

	// BlockBase block for the "Order Details" section: a 1..many table over the
	// Product's Order_Details navigation. The view (and therefore the table's items
	// binding) is created only when the user opens this tab, so the collection GET
	// /Products(id)/Order_Details is deferred until then.
	return BlockBase.extend("downport.blocks.orderdetails.OrderDetailsBlock", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "downport.blocks.orderdetails.OrderDetails",
					type: "XML"
				},
				Expanded: {
					viewName: "downport.blocks.orderdetails.OrderDetails",
					type: "XML"
				}
			}
		}
	});
});
