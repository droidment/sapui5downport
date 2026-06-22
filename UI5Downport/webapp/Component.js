sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("downport.Component", {
		metadata: {
			manifest: "json"
			// NOTE: the sap.ui.core.IAsyncContentCreation marker interface was removed
			// on purpose. With it set, getRouter() is undefined during init() (the
			// router is built later, asynchronously) and — at least on 1.120.30 — the
			// router is NOT auto-initialized (isInitialized() stayed false), so the
			// initial "main" route never displayed. Without the interface the router
			// is created synchronously in UIComponent.init, so we can initialize() it
			// right here. Views are still created asynchronously via the "async": true
			// flags on the manifest rootView and routing config.
		},

		init: function () {
			// Base init builds the models + root view (App) and the router from the
			// manifest. Then start the router so the empty pattern shows Main and
			// "Products/{productId}" shows the annotation-driven Object Page.
			UIComponent.prototype.init.apply(this, arguments);
			this.getRouter().initialize();
		}
	});
});
