sap.ui.define([
	"sap/base/Log",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Log, Filter, FilterOperator) {
	"use strict";

	var UI = "@com.sap.vocabularies.UI.v1.";
	var COMMON = "@com.sap.vocabularies.Common.v1.";
	var CAPABILITIES = "@Org.OData.Capabilities.V1.";
	var DATA_FIELD = "com.sap.vocabularies.UI.v1.DataField";
	var DATA_FIELD_FOR_ACTION = "com.sap.vocabularies.UI.v1.DataFieldForAction";
	var mTypeMap = {
		"Edm.Binary": "sap.ui.model.odata.type.Stream",
		"Edm.Boolean": "sap.ui.model.odata.type.Boolean",
		"Edm.Byte": "sap.ui.model.odata.type.Byte",
		"Edm.Date": "sap.ui.model.odata.type.Date",
		"Edm.DateTimeOffset": "sap.ui.model.odata.type.DateTimeOffset",
		"Edm.Decimal": "sap.ui.model.odata.type.Decimal",
		"Edm.Double": "sap.ui.model.odata.type.Double",
		"Edm.Guid": "sap.ui.model.odata.type.Guid",
		"Edm.Int16": "sap.ui.model.odata.type.Int16",
		"Edm.Int32": "sap.ui.model.odata.type.Int32",
		"Edm.Int64": "sap.ui.model.odata.type.Int64",
		"Edm.SByte": "sap.ui.model.odata.type.SByte",
		"Edm.Single": "sap.ui.model.odata.type.Single",
		"Edm.String": "sap.ui.model.odata.type.String",
		"Edm.TimeOfDay": "sap.ui.model.odata.type.TimeOfDay"
	};
	var mCache = new WeakMap();

	function trimTrailingSlash(sPath) {
		return (sPath || "").replace(/\/$/, "");
	}

	function annotationPath(sContextPath, sMetaPath) {
		if (!sMetaPath) {
			return trimTrailingSlash(sContextPath);
		}
		if (sMetaPath.charAt(0) === "/") {
			return sMetaPath;
		}
		return trimTrailingSlash(sContextPath) + "/" + sMetaPath;
	}

	function propertyPath(sContextPath, sPropertyPath) {
		return trimTrailingSlash(sContextPath) + "/" + sPropertyPath;
	}

	function cacheRequest(oMetaModel, sPath) {
		var mModelCache = mCache.get(oMetaModel);
		if (!mModelCache) {
			mModelCache = {};
			mCache.set(oMetaModel, mModelCache);
		}
		if (!mModelCache[sPath]) {
			mModelCache[sPath] = oMetaModel.requestObject(sPath).catch(function (oError) {
				delete mModelCache[sPath];
				throw oError;
			});
		}
		return mModelCache[sPath];
	}

	function enumTail(vValue) {
		var sValue = vValue && (vValue.$EnumMember || vValue);
		return typeof sValue === "string" ? sValue.split("/").pop() : sValue;
	}

	function annotationValue(oAnnotations, sName) {
		return oAnnotations && oAnnotations["@" + sName];
	}

	function pathValue(oValue) {
		return oValue && (oValue.$Path || oValue.$PropertyPath || oValue.path);
	}

	function restrictionPaths(oRestriction, sProperty) {
		return ((oRestriction && oRestriction[sProperty]) || []).map(function (oPath) {
			return pathValue(oPath);
		}).filter(Boolean);
	}

	function isHidden(vHidden) {
		return vHidden === true || (vHidden && vHidden.$Bool === "true");
	}

	function descriptorFromObjects(sName, oProperty, oAnnotations, oEntity, oRestrictions) {
		var oText = annotationValue(oAnnotations, "com.sap.vocabularies.Common.v1.Text");
		var sTextPath = pathValue(oText);
		var sArrangement = enumTail(oText && oText[COMMON + "TextArrangement"] ||
			annotationValue(oAnnotations, "com.sap.vocabularies.Common.v1.Text@com.sap.vocabularies.Common.v1.TextArrangement") ||
			annotationValue(oAnnotations, "com.sap.vocabularies.Common.v1.TextArrangement"));
		var aKeys = (oEntity && oEntity.$Key) || [];
		var aNonFilterable = restrictionPaths(oRestrictions.filter, "NonFilterableProperties");
		var aNonSortable = restrictionPaths(oRestrictions.sort, "NonSortableProperties");
		var vLabel = annotationValue(oAnnotations, "com.sap.vocabularies.Common.v1.Label");
		return {
			name: sName,
			path: sName,
			label: vLabel || sName,
			edmType: oProperty.$Type || "Edm.String",
			dataType: mTypeMap[oProperty.$Type] || "sap.ui.model.odata.type.String",
			nullable: oProperty.$Nullable !== false,
			key: aKeys.indexOf(sName) !== -1 || aKeys.some(function (vKey) {
				return (vKey && (vKey.$PropertyPath || vKey)) === sName;
			}),
			filterable: aNonFilterable.indexOf(sName) === -1,
			sortable: aNonSortable.indexOf(sName) === -1,
			textPath: sTextPath,
			textArrangement: sArrangement,
			hasValueHelp: !!annotationValue(oAnnotations, "com.sap.vocabularies.Common.v1.ValueList"),
			hidden: isHidden(annotationValue(oAnnotations, "com.sap.vocabularies.UI.v1.Hidden"))
		};
	}

	function requestRestrictions(oMetaModel, sContextPath) {
		var sBase = trimTrailingSlash(sContextPath);
		return Promise.all([
			cacheRequest(oMetaModel, sBase + CAPABILITIES + "FilterRestrictions").catch(function () { return null; }),
			cacheRequest(oMetaModel, sBase + CAPABILITIES + "SortRestrictions").catch(function () { return null; })
		]).then(function (aValues) {
			return { filter: aValues[0], sort: aValues[1] };
		});
	}

	function requestProperty(oMetaModel, sContextPath, sPropertyPath) {
		var sPath = propertyPath(sContextPath, sPropertyPath);
		return Promise.all([
			cacheRequest(oMetaModel, sPath),
			cacheRequest(oMetaModel, sPath + "@").catch(function () { return {}; }),
			cacheRequest(oMetaModel, trimTrailingSlash(sContextPath) + "/"),
			requestRestrictions(oMetaModel, sContextPath)
		]).then(function (aValues) {
			return descriptorFromObjects(sPropertyPath, aValues[0] || {}, aValues[1] || {}, aValues[2] || {}, aValues[3]);
		});
	}

	function requestProperties(oMetaModel, sContextPath) {
		return Promise.all([
			cacheRequest(oMetaModel, trimTrailingSlash(sContextPath) + "/"),
			requestRestrictions(oMetaModel, sContextPath)
		]).then(function (aValues) {
			var oEntity = aValues[0] || {};
			return Promise.all(Object.keys(oEntity).filter(function (sName) {
				return sName.charAt(0) !== "$" && oEntity[sName] && oEntity[sName].$kind === "Property";
			}).map(function (sName) {
				return cacheRequest(oMetaModel, propertyPath(sContextPath, sName) + "@").catch(function () { return {}; })
					.then(function (oAnnotations) {
						return descriptorFromObjects(sName, oEntity[sName], oAnnotations, oEntity, aValues[1]);
					});
			}));
		});
	}

	function requestAnnotation(oMetaModel, sContextPath, sMetaPath) {
		return cacheRequest(oMetaModel, annotationPath(sContextPath, sMetaPath));
	}

	function fetchModel(oControl) {
		var oModel = oControl.getModel && oControl.getModel();
		if (oModel) { return Promise.resolve(oModel); }
		return new Promise(function (resolve) {
			function onModelContextChange() {
				var oCurrentModel = oControl.getModel && oControl.getModel();
				if (oCurrentModel || oControl.isDestroyed && oControl.isDestroyed()) {
					oControl.detachModelContextChange(onModelContextChange);
					resolve(oCurrentModel);
				}
			}
			oControl.attachModelContextChange(onModelContextChange);
			onModelContextChange();
		});
	}

	function requestDataFields(oMetaModel, sContextPath, sMetaPath) {
		return requestAnnotation(oMetaModel, sContextPath, sMetaPath).then(function (aRecords) {
			return (aRecords || []).filter(function (oRecord) {
				return oRecord && (oRecord.$Type === DATA_FIELD || oRecord.$Type === DATA_FIELD_FOR_ACTION);
			});
		});
	}

	function selectionFieldPaths(aSelectionFields) {
		return (aSelectionFields || []).map(pathValue).filter(Boolean);
	}

	function dataFieldPath(oRecord) {
		return oRecord && oRecord.Value && pathValue(oRecord.Value);
	}

	function applyDataField(oDescriptor, oRecord) {
		var vLabel = oRecord && oRecord.Label;
		var vHidden = oRecord && oRecord[UI + "Hidden"];
		var vImportance = oRecord && oRecord[UI + "Importance"];
		return Object.assign({}, oDescriptor, {
			label: vLabel || oDescriptor.label,
			hidden: oDescriptor.hidden || isHidden(vHidden),
			importance: enumTail(vImportance)
		});
	}

	function conditionValue(oRange, sName) {
		var vValue = oRange && oRange[sName];
		if (vValue && typeof vValue === "object") {
			var aKeys = Object.keys(vValue).filter(function (sKey) { return sKey.charAt(0) === "$"; });
			return aKeys.length ? vValue[aKeys[0]] : undefined;
		}
		return vValue;
	}

	function operatorName(oRange) {
		var sOption = enumTail(oRange && oRange.Option) || "EQ";
		var mOperators = {
			EQ: FilterOperator.EQ,
			NE: FilterOperator.NE,
			GT: FilterOperator.GT,
			GE: FilterOperator.GE,
			LT: FilterOperator.LT,
			LE: FilterOperator.LE,
			BT: FilterOperator.BT,
			Contains: FilterOperator.Contains,
			StartsWith: FilterOperator.StartsWith,
			EndsWith: FilterOperator.EndsWith
		};
		return mOperators[sOption] || FilterOperator.EQ;
	}

	function selectionVariantFilters(oSelectionVariant) {
		var aFilters = [];
		((oSelectionVariant && oSelectionVariant.SelectOptions) || []).forEach(function (oSelectOption) {
			var sProperty = pathValue(oSelectOption.PropertyName);
			if (!sProperty) {
				return;
			}
			var aRanges = (oSelectOption.Ranges || []).map(function (oRange) {
				return new Filter(sProperty, operatorName(oRange), conditionValue(oRange, "Low"), conditionValue(oRange, "High"));
			});
			if (aRanges.length === 1) {
				aFilters.push(aRanges[0]);
			} else if (aRanges.length > 1) {
				aFilters.push(new Filter({ filters: aRanges, and: false }));
			}
		});
		return aFilters;
	}

	function queryOptions(aPaths) {
		var aSelect = [];
		var mExpand = {};
		(aPaths || []).filter(Boolean).forEach(function (sPath) {
			var aParts = sPath.split("/");
			if (aParts.length === 1) {
				if (aSelect.indexOf(sPath) === -1) { aSelect.push(sPath); }
			} else {
				var sNavigation = aParts.shift();
				mExpand[sNavigation] = mExpand[sNavigation] || [];
				var sNested = aParts.join("/");
				if (mExpand[sNavigation].indexOf(sNested) === -1) { mExpand[sNavigation].push(sNested); }
			}
		});
		var oParameters = {};
		if (aSelect.length) { oParameters.$select = aSelect.join(","); }
		var aExpand = Object.keys(mExpand).map(function (sNavigation) {
			return sNavigation + "($select=" + mExpand[sNavigation].join(",") + ")";
		});
		if (aExpand.length) { oParameters.$expand = aExpand.join(","); }
		return oParameters;
	}

	function warnUnsupported(sArea, oRecord) {
		Log.warning("Annotation runtime skipped unsupported " + sArea + " record", oRecord && oRecord.$Type, "mdcAnnotation");
	}

	return {
		UI: UI,
		COMMON: COMMON,
		DATA_FIELD: DATA_FIELD,
		DATA_FIELD_FOR_ACTION: DATA_FIELD_FOR_ACTION,
		annotationPath: annotationPath,
		propertyPath: propertyPath,
		requestAnnotation: requestAnnotation,
		fetchModel: fetchModel,
		requestDataFields: requestDataFields,
		requestProperty: requestProperty,
		requestProperties: requestProperties,
		selectionFieldPaths: selectionFieldPaths,
		dataFieldPath: dataFieldPath,
		pathValue: pathValue,
		applyDataField: applyDataField,
		selectionVariantFilters: selectionVariantFilters,
		queryOptions: queryOptions,
		warnUnsupported: warnUnsupported
	};
});
