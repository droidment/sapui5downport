sap.ui.define([
	"sap/ui/mdc/odata/v4/TableDelegate",
	"sap/ui/core/Core",
	"downport/annotation/AnnotationResolver",
	"downport/annotation/FieldFactory"
], function (ODataV4TableDelegate, Core, Resolver, FieldFactory) {
	"use strict";

	var Delegate = Object.assign({}, ODataV4TableDelegate);

	Delegate.fetchProperties = function (oTable) {
		return Resolver.fetchModel(oTable).then(function (oModel) {
			return oModel ? Resolver.requestProperties(oModel.getMetaModel(), oTable.getContextPath()) : [];
		}).then(function (aDescriptors) {
				return aDescriptors.filter(function (oDescriptor) { return !oDescriptor.hidden; }).map(function (oDescriptor) {
					oTable._mPropertyDescriptors[oDescriptor.name] = oDescriptor;
					return {
						name: oDescriptor.name,
						path: oDescriptor.path,
						label: oDescriptor.label,
						dataType: oDescriptor.dataType,
						key: oDescriptor.key,
						sortable: oDescriptor.sortable,
						filterable: oDescriptor.filterable,
						maxConditions: -1
					};
				});
			});
	};

	Delegate.addItem = function (oTable, sPropertyName) {
		var oExisting = oTable.getColumns().find(function (oColumn) {
			return oColumn.getPropertyKey() === sPropertyName;
		});
		if (oExisting) { return Promise.resolve(oExisting); }
		return Resolver.fetchModel(oTable).then(function (oModel) {
			return Resolver.requestProperty(oModel.getMetaModel(), oTable.getContextPath(), sPropertyName);
		})
			.then(function (oDescriptor) {
				oTable._mPropertyDescriptors[sPropertyName] = oDescriptor;
				return FieldFactory.createColumn(oTable, oDescriptor);
			});
	};

	Delegate.removeItem = function () { return Promise.resolve(true); };

	Delegate.updateBindingInfo = function (oTable, oBindingInfo) {
		ODataV4TableDelegate.updateBindingInfo.apply(this, arguments);
		oBindingInfo.path = oTable.getCollectionPath() || oTable.getContextPath();
		oBindingInfo.parameters = oBindingInfo.parameters || {};
		oBindingInfo.parameters.$count = true;
		if (oTable.getOwnRequest()) { oBindingInfo.parameters.$$ownRequest = true; }

		var aPaths = [];
		oTable.getColumns().forEach(function (oColumn) {
			var oDescriptor = oTable.getPropertyDescriptor(oColumn.getPropertyKey());
			if (oDescriptor) {
				aPaths.push(oDescriptor.path);
				if (oDescriptor.textPath) { aPaths.push(oDescriptor.textPath); }
			}
		});
		Object.assign(oBindingInfo.parameters, Resolver.queryOptions(aPaths));

		var aExtraFilters = oTable.getFixedFilters();
		var sFilterBarId = oTable.getFilter();
		var oFilterBar = sFilterBarId && Core.byId(sFilterBarId);
		if (oFilterBar && oFilterBar.getAdditionalFilters) {
			aExtraFilters = aExtraFilters.concat(oFilterBar.getAdditionalFilters());
		}
		if (aExtraFilters.length) {
			oBindingInfo.filters = (oBindingInfo.filters || []).concat(aExtraFilters);
		}
	};

	return Delegate;
});
