sap.ui.define([
	"sap/ui/mdc/FilterBarDelegate",
	"mdcAnnotation/ValueListResolver"
], function (FilterBarDelegate, ValueListResolver) {
	"use strict";

	var Delegate = Object.assign({}, FilterBarDelegate);

	Delegate.fetchProperties = function (oFilterBar) {
		var oPayload = oFilterBar.getPayload && oFilterBar.getPayload() || {};
		if (!oPayload.propertyPath) { return Promise.resolve([]); }
		return ValueListResolver.request(oFilterBar.getModel().getMetaModel(), oPayload.propertyPath)
			.then(function (oDefinition) {
				return oDefinition.descriptors.map(function (oDescriptor) {
					return {
						name: oDescriptor.name,
						path: oDescriptor.path,
						label: oDescriptor.label,
						dataType: oDescriptor.dataType,
						maxConditions: -1
					};
				});
			});
	};

	return Delegate;
});
