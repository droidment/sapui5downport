sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/uxap/ObjectPageSection",
	"sap/uxap/ObjectPageSubSection",
	"downport/blocks/generalinformation/GeneralInformationBlock",
	"downport/blocks/stockpricing/StockPricingBlock",
	"downport/blocks/orderdetails/OrderDetailsBlock"
], function (Controller, ObjectPageSection, ObjectPageSubSection,
	GeneralInformationBlock, StockPricingBlock, OrderDetailsBlock) {
	"use strict";

	// The Object Page is assembled from annotations read via the OData V4
	// ODataMetaModel:
	//   /Products/@UI.HeaderInfo   -> title + subtitle property paths
	//   /Products/@UI.Facets       -> one section per ReferenceFacet
	// Each section's CONTENT lives in its own sap.uxap.BlockBase block under
	// webapp/blocks/<section>/. A block's inner view is instantiated only when its
	// section is displayed (with useIconTabBar that is on tab selection; the first
	// tab renders immediately). The block's controller then builds its
	// annotation-driven content and issues that section's OData request — so each
	// section loads its data lazily, on demand. This is the freestyle equivalent of
	// a Fiori Elements Object Page block with lazy loading.
	var ENTITY = "/Products";
	var UI = "@com.sap.vocabularies.UI.v1.";

	return Controller.extend("downport.controller.ObjectPage", {

		onInit: function () {
			this._oLayout = this.byId("objectPageLayout");
			this._oHeader = this.byId("opHeader");
			this.getOwnerComponent().getRouter()
				.getRoute("object")
				.attachPatternMatched(this._onObjectMatched, this);
		},

		_onObjectMatched: function (oEvent) {
			this._sProductId = oEvent.getParameter("arguments").productId;
			var that = this;
			// Header structure (title/subtitle bindings, facet list) is annotation
			// metadata and only needs to be read once.
			if (!this._pBuilt) {
				this._pBuilt = this._buildStructure();
			}
			this._pBuilt.then(function () {
				// Fresh section + block instances per navigation so a product switch
				// gets new block views that reload for the new product (and re-defer
				// until their tab is opened).
				that._rebuildSections();
				that._bindProduct();
			});
		},

		_buildStructure: function () {
			var oMetaModel = this.getView().getModel().getMetaModel();
			this._oMetaModel = oMetaModel;
			var that = this;
			return Promise.all([
				oMetaModel.requestObject(ENTITY + "/" + UI + "HeaderInfo"),
				oMetaModel.requestObject(ENTITY + "/" + UI + "Facets")
			]).then(function (aResult) {
				that._aFacets = aResult[1] || [];
				that._buildHeader(aResult[0]);
			});
		},

		// HeaderInfo -> bind title/subtitle, set page title, record the header fields
		// so the per-product binding can $select them for the title/subtitle.
		_buildHeader: function (oHeaderInfo) {
			this._aHeaderFields = [];
			if (!oHeaderInfo) {
				return;
			}
			var sTitlePath = oHeaderInfo.Title && oHeaderInfo.Title.Value && oHeaderInfo.Title.Value.$Path;
			var sDescPath = oHeaderInfo.Description && oHeaderInfo.Description.Value && oHeaderInfo.Description.Value.$Path;
			if (sTitlePath) {
				this._oHeader.bindProperty("objectTitle", { path: sTitlePath });
				this._addHeaderField(sTitlePath);
			}
			if (sDescPath) {
				this._oHeader.bindProperty("objectSubtitle", { path: sDescPath });
				this._addHeaderField(sDescPath);
			}
			if (oHeaderInfo.TypeName) {
				this.byId("objectPage").setTitle(oHeaderInfo.TypeName);
			}
		},

		_addHeaderField: function (sPath) {
			if (sPath && this._aHeaderFields.indexOf(sPath) === -1) {
				this._aHeaderFields.push(sPath);
			}
		},

		// One section per ReferenceFacet, each hosting the block that matches its
		// annotation target. Rebuilt on every navigation.
		_rebuildSections: function () {
			var that = this;
			this._oLayout.destroySections();
			(this._aFacets || []).forEach(function (oFacet) {
				if (oFacet.$Type !== "com.sap.vocabularies.UI.v1.ReferenceFacet") {
					return;
				}
				var sTarget = oFacet.Target && oFacet.Target.$AnnotationPath;
				if (!sTarget) {
					return;
				}
				var oBlock = that._blockForFacet(sTarget);
				if (!oBlock) {
					return;
				}
				that._oLayout.addSection(new ObjectPageSection({
					title: oFacet.Label || "",
					subSections: [ new ObjectPageSubSection({ blocks: [ oBlock ] }) ]
				}));
			});
		},

		// Map a facet's annotation target to its block module.
		_blockForFacet: function (sTarget) {
			if (sTarget.indexOf("FieldGroup#General") !== -1) {
				return new GeneralInformationBlock();
			}
			if (sTarget.indexOf("FieldGroup#Stock") !== -1) {
				return new StockPricingBlock();
			}
			if (sTarget.indexOf("LineItem") !== -1) {
				return new OrderDetailsBlock();
			}
			return null;
		},

		// Bind the view to the product. The $select carries only the header fields;
		// each block fetches its own fields via its own binding when it renders.
		_bindProduct: function () {
			this.getView().bindElement({
				path: "/Products(" + this._sProductId + ")",
				parameters: { $select: this._aHeaderFields.join(",") }
			});
		},

		onNavBack: function () {
			this.getOwnerComponent().getRouter().navTo("main");
		}
	});
});
