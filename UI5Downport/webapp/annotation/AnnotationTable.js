sap.ui.define([
	"sap/ui/mdc/Table",
	"sap/m/Button",
	"sap/ui/mdc/actiontoolbar/ActionToolbarAction",
	"downport/annotation/AnnotationResolver",
	"downport/annotation/FieldFactory"
], function (Table, Button, ActionToolbarAction, Resolver, FieldFactory) {
	"use strict";

	var AnnotationTable = Table.extend("downport.annotation.AnnotationTable", {
		metadata: {
			properties: {
				contextPath: { type: "string" },
				metaPath: { type: "string", defaultValue: "@com.sap.vocabularies.UI.v1.LineItem" },
				selectionVariantPath: { type: "string", defaultValue: "" },
				collectionPath: { type: "string", defaultValue: "" },
				ownRequest: { type: "boolean", defaultValue: false }
			},
			events: {
				annotationAction: {
					parameters: {
						actionId: { type: "string" },
						label: { type: "string" },
						contexts: { type: "object[]" },
						sourceControl: { type: "sap.ui.core.Control" }
					}
				}
			}
		},
		renderer: Table.getMetadata().getRenderer()
	});

	AnnotationTable.prototype.init = function () {
		Table.prototype.init.apply(this, arguments);
		this.setDelegate({ name: "downport/annotation/delegate/TableDelegate", payload: {} });
		this._mPropertyDescriptors = {};
		this._aFixedFilters = [];
	};

	AnnotationTable.prototype.onBeforeRendering = function () {
		if (Table.prototype.onBeforeRendering) {
			Table.prototype.onBeforeRendering.apply(this, arguments);
		}
		this._ensureBuilt();
	};

	AnnotationTable.prototype._ensureBuilt = function () {
		var oModel = this.getModel();
		if (this._pAnnotationBuild || !oModel || !this.getContextPath()) {
			return this._pAnnotationBuild || Promise.resolve();
		}
		var that = this;
		var oMetaModel = oModel.getMetaModel();
		this._pAnnotationBuild = Promise.all([
			Resolver.requestDataFields(oMetaModel, this.getContextPath(), this.getMetaPath()),
			this.getSelectionVariantPath() ? Resolver.requestAnnotation(oMetaModel, this.getContextPath(), this.getSelectionVariantPath()) : null
		]).then(function (aValues) {
			that._aFixedFilters = Resolver.selectionVariantFilters(aValues[1]);
			var aRecords = aValues[0];
			return Promise.all(aRecords.map(function (oRecord) {
				var sPath = Resolver.dataFieldPath(oRecord);
				return sPath ? Resolver.requestProperty(oMetaModel, that.getContextPath(), sPath).then(function (oDescriptor) {
					return { record: oRecord, descriptor: Resolver.applyDataField(oDescriptor, oRecord) };
				}) : { record: oRecord };
			}));
		}).then(function (aDefinitions) {
			aDefinitions.forEach(function (oDefinition) {
				var oRecord = oDefinition.record;
				if (oRecord.$Type === Resolver.DATA_FIELD && oDefinition.descriptor && !oDefinition.descriptor.hidden) {
					that._mPropertyDescriptors[oDefinition.descriptor.name] = oDefinition.descriptor;
					if (!that._findColumn(oDefinition.descriptor.name)) {
						that.addColumn(FieldFactory.createColumn(that, oDefinition.descriptor));
					}
				} else if (oRecord.$Type === Resolver.DATA_FIELD_FOR_ACTION && oRecord.Action) {
					that._addAnnotationAction(oRecord);
				}
			});
			return that.initialized().then(function () {
				if (!that.isDestroyed()) { that.rebind(); }
			});
		});
		return this._pAnnotationBuild;
	};

	AnnotationTable.prototype._findColumn = function (sPropertyName) {
		return this.getColumns().find(function (oColumn) {
			return oColumn.getPropertyKey && oColumn.getPropertyKey() === sPropertyName;
		});
	};

	AnnotationTable.prototype._addAnnotationAction = function (oRecord) {
		var that = this;
		var oButton = new Button({
			text: oRecord.Label || oRecord.Action,
			type: "Emphasized",
			press: function () {
				var aContexts = that.getSelectedContexts ? that.getSelectedContexts() : [];
				that.fireAnnotationAction({
					actionId: oRecord.Action,
					label: oRecord.Label || oRecord.Action,
					contexts: aContexts,
					sourceControl: that
				});
			}
		});
		oButton.data("annotationAction", oRecord.Action);
		this.addAction(new ActionToolbarAction({ action: oButton }));
	};

	AnnotationTable.prototype.getFixedFilters = function () {
		return this._aFixedFilters.slice();
	};

	AnnotationTable.prototype.getPropertyDescriptor = function (sName) {
		return this._mPropertyDescriptors[sName];
	};

	return AnnotationTable;
});
