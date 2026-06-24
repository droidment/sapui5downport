sap.ui.define([
	"sap/ui/mdc/table/Column",
	"sap/ui/mdc/actiontoolbar/ActionToolbarAction",
	"sap/ui/mdc/FilterField",
	"sap/ui/mdc/ValueHelp",
	"sap/ui/mdc/valuehelp/Popover",
	"sap/ui/mdc/valuehelp/Dialog",
	"sap/ui/mdc/valuehelp/content/MTable",
	"sap/m/Text",
	"sap/m/Button"
], function (Column, ActionToolbarAction, FilterField, ValueHelp, Popover, Dialog, MTable, Text, Button) {
	"use strict";

	// =====================================================================
	// MetadataDriven — the freestyle analogue of the sap.fe.macros Table and
	// FilterBar building blocks. It reads the SAME UI/Common vocabulary terms FE
	// reads, via the OData V4 ODataMetaModel, and builds MDC controls at runtime:
	//
	//   UI.LineItem        -> mdc.Table columns (+ DataFieldForAction -> toolbar actions)
	//   UI.SelectionFields -> mdc.FilterBar FilterFields
	//   Common.ValueList   -> annotation-driven ValueHelp on a FilterField
	//   Common.Label       -> column / field / property labels
	//   $metadata          -> EDM types -> sap.ui.model.odata.type.* + alignment
	//
	// Nothing about WHICH fields/columns/filters/actions exist is hard-coded — change
	// the annotations and the page changes. FE does this via XML templating at
	// preprocessing time; we do it programmatically, matching the Object Page
	// controller's existing annotation-walking style.
	// =====================================================================

	var UI = "@com.sap.vocabularies.UI.v1.";
	var COMMON = "@com.sap.vocabularies.Common.v1.";
	var DATAFIELD = "com.sap.vocabularies.UI.v1.DataField";
	var DATAFIELD_ACTION = "com.sap.vocabularies.UI.v1.DataFieldForAction";

	// EDM primitive -> sap.ui.model.odata.type.*. Anything unmapped falls back to String.
	var EDM_TYPE = {
		"Edm.String": "sap.ui.model.odata.type.String",
		"Edm.Boolean": "sap.ui.model.odata.type.Boolean",
		"Edm.Byte": "sap.ui.model.odata.type.Byte",
		"Edm.SByte": "sap.ui.model.odata.type.SByte",
		"Edm.Int16": "sap.ui.model.odata.type.Int16",
		"Edm.Int32": "sap.ui.model.odata.type.Int32",
		"Edm.Int64": "sap.ui.model.odata.type.Int64",
		"Edm.Single": "sap.ui.model.odata.type.Single",
		"Edm.Double": "sap.ui.model.odata.type.Double",
		"Edm.Decimal": "sap.ui.model.odata.type.Decimal",
		"Edm.Date": "sap.ui.model.odata.type.Date",
		"Edm.DateTimeOffset": "sap.ui.model.odata.type.DateTimeOffset",
		"Edm.TimeOfDay": "sap.ui.model.odata.type.TimeOfDay",
		"Edm.Guid": "sap.ui.model.odata.type.Guid"
	};
	var NUMERIC = {
		"Edm.Byte": true, "Edm.SByte": true, "Edm.Int16": true, "Edm.Int32": true,
		"Edm.Int64": true, "Edm.Single": true, "Edm.Double": true, "Edm.Decimal": true
	};

	// Ensure $metadata + annotations are loaded, then resolve with the meta model
	// (after this resolves, getObject(...) reads are synchronous).
	function ensureLoaded(oControl, sEntity) {
		var oMetaModel = oControl.getModel().getMetaModel();
		return oMetaModel.requestObject(sEntity + "/").then(function () { return oMetaModel; });
	}

	// Read every structural property of the entity type into a flat descriptor list.
	function readProperties(oMetaModel, sEntity) {
		var oType = oMetaModel.getObject(sEntity + "/") || {};
		var aKeys = oType.$Key || [];
		var aProps = [];
		Object.keys(oType).forEach(function (sName) {
			if (sName.charAt(0) === "$") { return; }
			var oProp = oType[sName];
			if (!oProp || oProp.$kind !== "Property") { return; }   // skip navigation props
			var sEdm = oProp.$Type;
			aProps.push({
				name: sName,
				path: sName,
				label: oMetaModel.getObject(sEntity + "/" + sName + COMMON + "Label") || sName,
				dataType: EDM_TYPE[sEdm] || "sap.ui.model.odata.type.String",
				numeric: NUMERIC[sEdm] === true,
				key: aKeys.indexOf(sName) !== -1
			});
		});
		return aProps;
	}

	function indexByName(aProps) {
		var mByName = {};
		aProps.forEach(function (oProp) { mByName[oProp.name] = oProp; });
		return mByName;
	}

	return {

		// ---- fetchProperties for the two MDC delegates (derived from $metadata) ----

		fetchTableProperties: function (oControl, sEntity) {
			return ensureLoaded(oControl, sEntity).then(function (oMetaModel) {
				return readProperties(oMetaModel, sEntity).map(function (p) {
					return {
						name: p.name, path: p.path, label: p.label, dataType: p.dataType,
						key: p.key, sortable: true, filterable: true
					};
				});
			});
		},

		fetchFilterBarProperties: function (oControl, sEntity) {
			return ensureLoaded(oControl, sEntity).then(function (oMetaModel) {
				return readProperties(oMetaModel, sEntity).map(function (p) {
					return {
						name: p.name, path: p.path, label: p.label,
						dataType: p.dataType, maxConditions: -1
					};
				});
			});
		},

		// ---- UI.LineItem -> mdc.Table columns + DataFieldForAction toolbar actions ----
		// mPress maps an Action id to a press handler fn(oButton). Resolves with a map of
		// the created action buttons (by Action id) for enable/disable bookkeeping.
		buildColumns: function (oTable, sEntity, mPress) {
			mPress = mPress || {};
			return ensureLoaded(oTable, sEntity).then(function (oMetaModel) {
				var aLineItem = oMetaModel.getObject(sEntity + "/" + UI + "LineItem") || [];
				var mProps = indexByName(readProperties(oMetaModel, sEntity));
				var mButtons = {};
				aLineItem.forEach(function (oRec) {
					if (oRec.$Type === DATAFIELD && oRec.Value && oRec.Value.$Path) {
						var sPath = oRec.Value.$Path;
						var oProp = mProps[sPath] || {};
						oTable.addColumn(new Column({
							header: oRec.Label || oProp.label || sPath,
							propertyKey: sPath,
							hAlign: oProp.numeric ? "End" : "Begin",
							template: new Text({ text: "{" + sPath + "}", wrapping: false })
						}));
					} else if (oRec.$Type === DATAFIELD_ACTION && oRec.Action) {
						var sActionId = oRec.Action;
						var oButton = new Button({ text: oRec.Label || sActionId });
						oButton.attachPress(function () {
							if (mPress[sActionId]) { mPress[sActionId](oButton); }
						});
						oTable.addAction(new ActionToolbarAction({ action: oButton }));
						mButtons[sActionId] = oButton;
					}
				});
				return mButtons;
			});
		},

		// ---- UI.SelectionFields -> mdc.FilterBar FilterFields (+ annotation ValueHelp) ----
		buildFilterFields: function (oFilterBar, sEntity) {
			return ensureLoaded(oFilterBar, sEntity).then(function (oMetaModel) {
				var aSelectionFields = oMetaModel.getObject(sEntity + "/" + UI + "SelectionFields") || [];
				var mProps = indexByName(readProperties(oMetaModel, sEntity));
				aSelectionFields.forEach(function (oRef) {
					var sPath = oRef.$PropertyPath;
					if (!sPath) { return; }
					var oProp = mProps[sPath] || {};
					// A property's value help is itself annotation-driven: if it carries a
					// Common.ValueList we attach the annotation-driven ValueListHelpDelegate
					// (empty MTables, filled at runtime from requestValueListInfo); otherwise
					// the field is plain free-text — exactly as fe.macros would render it.
					var bHasValueList = !!oMetaModel.getObject(sEntity + "/" + sPath + COMMON + "ValueList");
					var oValueHelp;
					if (bHasValueList) {
						oValueHelp = new ValueHelp({
							delegate: {
								name: "downport/delegate/ValueListHelpDelegate",
								payload: { propertyPath: sEntity + "/" + sPath }
							},
							typeahead: new Popover({ content: [new MTable()] }),
							dialog: new Dialog({ content: [new MTable()] })
						});
					}
					var oField = new FilterField({
						label: oProp.label || sPath,
						propertyKey: sPath,
						dataType: oProp.dataType,
						maxConditions: -1,
						display: bHasValueList ? "DescriptionValue" : "Value",
						conditions: "{$filters>/conditions/" + sPath + "}"
					});
					if (oValueHelp) {
						oField.setValueHelp(oValueHelp.getId());
						oField.addDependent(oValueHelp);
					}
					oFilterBar.addFilterItem(oField);
				});
			});
		}
	};
});
