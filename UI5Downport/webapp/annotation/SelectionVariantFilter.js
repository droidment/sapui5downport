sap.ui.define([
	"sap/m/HBox",
	"sap/m/HBoxRenderer",
	"sap/m/Label",
	"sap/m/Switch",
	"sap/ui/core/Core",
	"downport/annotation/AnnotationResolver"
], function (HBox, HBoxRenderer, Label, Switch, Core, Resolver) {
	"use strict";

	var SelectionVariantFilter = HBox.extend("downport.annotation.SelectionVariantFilter", {
		metadata: {
			properties: {
				contextPath: { type: "string" },
				metaPath: { type: "string" }
			},
			associations: {
				filterBar: { type: "downport.annotation.AnnotationFilterBar", multiple: false }
			}
		},
		renderer: HBoxRenderer
	});

	SelectionVariantFilter.prototype.init = function () {
		HBox.prototype.init.apply(this, arguments);
		var that = this;
		this.setAlignItems("Center");
		this._oLabel = new Label({ labelFor: this.getId() + "--switch" }).addStyleClass("sapUiTinyMarginEnd");
		this._oSwitch = new Switch(this.getId() + "--switch", {
			customTextOn: "On",
			customTextOff: "All",
			change: function (oEvent) {
				var oFilterBar = Core.byId(that.getFilterBar());
				if (oFilterBar && oFilterBar.setSelectionVariantActive) {
					oFilterBar.setSelectionVariantActive(that.getMetaPath(), oEvent.getParameter("state"));
				}
			}
		});
		this.addItem(this._oLabel);
		this.addItem(this._oSwitch);
	};

	SelectionVariantFilter.prototype.onBeforeRendering = function () {
		if (HBox.prototype.onBeforeRendering) {
			HBox.prototype.onBeforeRendering.apply(this, arguments);
		}
		var oModel = this.getModel();
		if (this._pLabel || !oModel || !this.getContextPath() || !this.getMetaPath()) { return; }
		var that = this;
		this._pLabel = Resolver.requestAnnotation(oModel.getMetaModel(), this.getContextPath(), this.getMetaPath())
			.then(function (oSelectionVariant) {
				that._oLabel.setText(oSelectionVariant && oSelectionVariant.Text || that.getMetaPath().split("#").pop());
			});
	};

	return SelectionVariantFilter;
});
