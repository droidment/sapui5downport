sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/Column",
	"sap/m/Text",
	"sap/m/ColumnListItem"
], function (Controller, Column, Text, ColumnListItem) {
	"use strict";

	var ENTITY = "/Products";
	var NAV = "Order_Details"; // 1..many navigation from Product
	var LINE_ITEM = ENTITY + "/" + NAV + "/@com.sap.vocabularies.UI.v1.LineItem";
	var LABEL = "@com.sap.vocabularies.Common.v1.Label";

	return Controller.extend("downport.blocks.orderdetails.OrderDetails", {

		onInit: function () {
			this.getView().addEventDelegate({ onBeforeRendering: this._build }, this);
		},

		_build: function () {
			if (this._bBuilt) {
				return;
			}
			var oContext = this.getView().getBindingContext();
			if (!oContext) {
				return;
			}
			this._bBuilt = true;

			var oMeta = this.getView().getModel().getMetaModel();
			var oTable = this.byId("table");
			var aLineItem = oMeta.getObject(LINE_ITEM) || [];

			var oTemplate = new ColumnListItem();
			aLineItem.forEach(function (oData) {
				if (oData.$Type !== "com.sap.vocabularies.UI.v1.DataField") {
					return;
				}
				var sPath = oData.Value && oData.Value.$Path;
				if (!sPath) {
					return;
				}
				var sLabel = oMeta.getObject(ENTITY + "/" + NAV + "/" + sPath + LABEL) || sPath;
				oTable.addColumn(new Column({ header: new Text({ text: sLabel }) }));
				oTemplate.addCell(new Text({ text: "{" + sPath + "}" }));
			});

			// $$ownRequest: the product context binding never $expanded Order_Details,
			// so this relative list binding must issue its own request. That GET
			// (/Products(id)/Order_Details) fires now, when this block's view renders.
			oTable.bindItems({
				path: NAV,
				template: oTemplate,
				templateShareable: false,
				parameters: { $$ownRequest: true }
			});
		}
	});
});
