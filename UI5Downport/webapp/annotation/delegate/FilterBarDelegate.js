sap.ui.define([
	"sap/ui/mdc/FilterBarDelegate",
	"downport/annotation/AnnotationResolver",
	"downport/annotation/FieldFactory"
], function (FilterBarDelegate, Resolver, FieldFactory) {
	"use strict";

	var Delegate = Object.assign({}, FilterBarDelegate);

	Delegate.fetchProperties = function (oFilterBar) {
		return Resolver.fetchModel(oFilterBar).then(function (oModel) {
			return oModel ? Resolver.requestProperties(oModel.getMetaModel(), oFilterBar.getContextPath()) : [];
		}).then(function (aDescriptors) {
				return aDescriptors.filter(function (oDescriptor) { return !oDescriptor.hidden; }).map(function (oDescriptor) {
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

	Delegate.addItem = function (oFilterBar, sPropertyName) {
		var oExisting = oFilterBar.getFilterItems().find(function (oField) {
			return oField.getPropertyKey() === sPropertyName;
		});
		if (oExisting) { return Promise.resolve(oExisting); }
		return Resolver.fetchModel(oFilterBar).then(function (oModel) {
			return Resolver.requestProperty(oModel.getMetaModel(), oFilterBar.getContextPath(), sPropertyName);
		})
			.then(function (oDescriptor) {
				return FieldFactory.createFilterField(
					oFilterBar,
					oDescriptor,
					Resolver.propertyPath(oFilterBar.getContextPath(), sPropertyName)
				);
			});
	};

	Delegate.removeItem = function () { return Promise.resolve(true); };

	return Delegate;
});
