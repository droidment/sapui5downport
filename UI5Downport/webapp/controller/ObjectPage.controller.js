sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"downport/annotation/ActionExecutor"
], function (Controller, ActionExecutor) {
	"use strict";

	return Controller.extend("downport.controller.ObjectPage", {
		onInit: function () {
			this.getOwnerComponent().getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
		},

		_onObjectMatched: function (oEvent) {
			var sProductId = oEvent.getParameter("arguments").productId;
			this.byId("annotationObjectPage").bindEntity("/Products(" + sProductId + ")");
		},

		onAnnotationAction: function (oEvent) {
			return ActionExecutor.execute(oEvent, this.getOwnerComponent());
		},

		onNavBack: function () {
			this.getOwnerComponent().getRouter().navTo("main");
		}
	});
});
