sap.ui.define([
	"mdcAnnotation/AnnotationResolver"
], function (Resolver) {
	"use strict";

	function firstValueList(mValueLists) {
		return mValueLists && (mValueLists[""] || mValueLists[Object.keys(mValueLists)[0]]);
	}

	function analyze(oInfo) {
		var aColumns = [];
		var aDisplay = [];
		var sKeyPath;
		(oInfo.Parameters || []).forEach(function (oParameter) {
			var sType = oParameter.$Type || "";
			var sProperty = oParameter.ValueListProperty;
			if (!sProperty) { return; }
			if (aColumns.indexOf(sProperty) === -1) { aColumns.push(sProperty); }
			if (!sKeyPath && /ValueListParameter(InOut|In|Out)$/.test(sType)) {
				sKeyPath = sProperty;
			}
			if (/ValueListParameterDisplayOnly$/.test(sType)) { aDisplay.push(sProperty); }
		});
		return {
			label: oInfo.Label,
			collectionPath: "/" + oInfo.CollectionPath,
			keyPath: sKeyPath || aColumns[0],
			descriptionPath: aDisplay[0] || sKeyPath || aColumns[0],
			displayColumns: aDisplay,
			columns: aColumns
		};
	}

	function request(oMetaModel, sPropertyPath) {
		return oMetaModel.requestValueListInfo(sPropertyPath).then(function (mValueLists) {
			var oInfo = firstValueList(mValueLists);
			if (!oInfo) { throw new Error("No Common.ValueList found for " + sPropertyPath); }
			var oDefinition = analyze(oInfo);
			return Promise.all(oDefinition.columns.map(function (sProperty) {
				return Resolver.requestProperty(oMetaModel, oDefinition.collectionPath, sProperty);
			})).then(function (aDescriptors) {
				oDefinition.descriptors = aDescriptors;
				return oDefinition;
			});
		});
	}

	return { request: request, analyze: analyze };
});
