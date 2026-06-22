sap.ui.define([
	"sap/ui/core/ComponentContainer"
], function (ComponentContainer) {
	"use strict";

	new ComponentContainer({
		name: "downport",
		manifest: true,
		height: "100%",
		settings: {
			id: "downport"
		}
	}).placeAt("content");
});
