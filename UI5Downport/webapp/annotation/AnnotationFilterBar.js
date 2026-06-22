sap.ui.define([
	"sap/ui/mdc/FilterBar",
	"sap/ui/mdc/filterbar/FilterBarBaseRenderer",
	"sap/ui/mdc/condition/Condition",
	"sap/ui/mdc/enum/ConditionValidated",
	"downport/annotation/AnnotationResolver",
	"downport/annotation/FieldFactory"
], function (FilterBar, FilterBarBaseRenderer, Condition, ConditionValidated, Resolver, FieldFactory) {
	"use strict";

	var AnnotationFilterBar = FilterBar.extend("downport.annotation.AnnotationFilterBar", {
		metadata: {
			properties: {
				contextPath: { type: "string" },
				metaPath: { type: "string", defaultValue: "@com.sap.vocabularies.UI.v1.SelectionFields" },
				selectionVariantPath: { type: "string", defaultValue: "" }
			}
		},
		renderer: FilterBarBaseRenderer
	});

	AnnotationFilterBar.prototype.init = function () {
		FilterBar.prototype.init.apply(this, arguments);
		this.setDelegate({ name: "downport/annotation/delegate/FilterBarDelegate", payload: {} });
		this._mSelectionVariantFilters = {};
	};

	AnnotationFilterBar.prototype.onBeforeRendering = function () {
		if (FilterBar.prototype.onBeforeRendering) {
			FilterBar.prototype.onBeforeRendering.apply(this, arguments);
		}
		this._ensureBuilt();
	};

	AnnotationFilterBar.prototype._ensureBuilt = function () {
		var oModel = this.getModel();
		if (this._pAnnotationBuild || !oModel || !this.getContextPath()) {
			return this._pAnnotationBuild || Promise.resolve();
		}
		var oMetaModel = oModel.getMetaModel();
		var that = this;
		this._pAnnotationBuild = Resolver.requestAnnotation(oMetaModel, this.getContextPath(), this.getMetaPath())
			.then(function (aSelectionFields) {
				return Promise.all(Resolver.selectionFieldPaths(aSelectionFields).map(function (sPropertyPath) {
					return Resolver.requestProperty(oMetaModel, that.getContextPath(), sPropertyPath);
				}));
			}).then(function (aDescriptors) {
				aDescriptors.filter(function (oDescriptor) { return !oDescriptor.hidden && oDescriptor.filterable; })
					.forEach(function (oDescriptor) {
						if (!that._findFilterField(oDescriptor.name)) {
							that.addFilterItem(FieldFactory.createFilterField(
								that,
								oDescriptor,
								Resolver.propertyPath(that.getContextPath(), oDescriptor.path)
							));
						}
					});
				return that._applyInitialSelectionVariant();
			});
		return this._pAnnotationBuild;
	};

	AnnotationFilterBar.prototype._findFilterField = function (sPropertyName) {
		return this.getFilterItems().find(function (oField) {
			return oField.getPropertyKey && oField.getPropertyKey() === sPropertyName;
		});
	};

	AnnotationFilterBar.prototype._applyInitialSelectionVariant = function () {
		var sPath = this.getSelectionVariantPath();
		if (!sPath) { return Promise.resolve(); }
		var that = this;
		return Resolver.requestAnnotation(this.getModel().getMetaModel(), this.getContextPath(), sPath)
			.then(function (oSelectionVariant) {
				var mConditions = Object.assign({}, that.getConditions());
				(oSelectionVariant.SelectOptions || []).forEach(function (oSelectOption) {
					var sProperty = Resolver.pathValue(oSelectOption.PropertyName);
					if (!sProperty) { return; }
					mConditions[sProperty] = (oSelectOption.Ranges || []).map(function (oRange) {
						var sOperator = String(oRange.Option || "EQ").split("/").pop();
						var vLow = oRange.Low && typeof oRange.Low === "object" ? oRange.Low[Object.keys(oRange.Low)[0]] : oRange.Low;
						var vHigh = oRange.High && typeof oRange.High === "object" ? oRange.High[Object.keys(oRange.High)[0]] : oRange.High;
						return Condition.createCondition(sOperator, vHigh === undefined ? [vLow] : [vLow, vHigh], undefined, undefined, ConditionValidated.Validated);
					});
				});
				that.setFilterConditions(mConditions);
			});
	};

	AnnotationFilterBar.prototype.setSelectionVariantActive = function (sMetaPath, bActive) {
		var that = this;
		if (!bActive) {
			delete this._mSelectionVariantFilters[sMetaPath];
			this.triggerSearch();
			return Promise.resolve();
		}
		return Resolver.requestAnnotation(this.getModel().getMetaModel(), this.getContextPath(), sMetaPath)
			.then(function (oSelectionVariant) {
				that._mSelectionVariantFilters[sMetaPath] = Resolver.selectionVariantFilters(oSelectionVariant);
				that.triggerSearch();
			});
	};

	AnnotationFilterBar.prototype.getAdditionalFilters = function () {
		var mFilters = this._mSelectionVariantFilters;
		return Object.keys(mFilters).reduce(function (aAll, sPath) {
			return aAll.concat(mFilters[sPath]);
		}, []);
	};

	return AnnotationFilterBar;
});
