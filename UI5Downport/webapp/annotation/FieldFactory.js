sap.ui.define([
	"sap/m/Text",
	"sap/ui/mdc/FilterField",
	"sap/ui/mdc/ValueHelp",
	"sap/ui/mdc/valuehelp/Popover",
	"sap/ui/mdc/valuehelp/Dialog",
	"sap/ui/mdc/valuehelp/content/MTable",
	"sap/ui/mdc/filterbar/vh/FilterBar",
	"sap/ui/mdc/table/Column"
], function (Text, FilterField, ValueHelp, ValueHelpPopover, ValueHelpDialog, ValueHelpMTable,
	ValueHelpFilterBar, Column) {
	"use strict";

	function safeId(sValue) {
		return (sValue || "field").replace(/[^A-Za-z0-9_-]/g, "-");
	}

	function formattedValue(vValue, vText, sArrangement) {
		if (vText === undefined || vText === null || vText === "") {
			return vValue;
		}
		switch (sArrangement) {
		case "TextOnly": return vText;
		case "TextLast": return vValue + " (" + vText + ")";
		case "TextSeparate": return vValue + " - " + vText;
		case "TextFirst":
		default: return vText + " (" + vValue + ")";
		}
	}

	function createDisplay(oDescriptor) {
		var oText = new Text({ wrapping: false });
		if (oDescriptor.textPath) {
			oText.bindProperty("text", {
				parts: [{ path: oDescriptor.path }, { path: oDescriptor.textPath }],
				formatter: function (vValue, vText) {
					return formattedValue(vValue, vText, oDescriptor.textArrangement);
				}
			});
		} else {
			oText.bindProperty("text", { path: oDescriptor.path });
		}
		return oText;
	}

	function createValueHelp(oOwner, oDescriptor, sPropertyMetaPath) {
		var sId = oOwner.getId() + "--vh-" + safeId(oDescriptor.name);
		var oTypeaheadContent = new ValueHelpMTable();
		var oDialogContent = new ValueHelpMTable({
			filterBar: new ValueHelpFilterBar({
				delegate: {
					name: "downport/annotation/delegate/ValueHelpFilterBarDelegate",
					payload: { propertyPath: sPropertyMetaPath }
				}
			})
		});
		return new ValueHelp(sId, {
			delegate: {
				name: "downport/annotation/delegate/ValueHelpDelegate",
				payload: { propertyPath: sPropertyMetaPath }
			},
			typeahead: new ValueHelpPopover({ content: oTypeaheadContent }),
			dialog: new ValueHelpDialog({ title: oDescriptor.label, content: oDialogContent })
		});
	}

	function createFilterField(oOwner, oDescriptor, sPropertyMetaPath) {
		var oField = new FilterField(oOwner.getId() + "--ff-" + safeId(oDescriptor.name), {
			propertyKey: oDescriptor.name,
			label: oDescriptor.label,
			dataType: oDescriptor.dataType,
			maxConditions: -1,
			conditions: { path: "$filters>/conditions/" + oDescriptor.name }
		});
		if (oDescriptor.hasValueHelp) {
			var oValueHelp = createValueHelp(oField, oDescriptor, sPropertyMetaPath);
			oField.addDependent(oValueHelp);
			oField.setValueHelp(oValueHelp);
			if (oDescriptor.textPath) {
				oField.setDisplay("DescriptionValue");
			}
		}
		return oField;
	}

	function createColumn(oOwner, oDescriptor) {
		return new Column(oOwner.getId() + "--col-" + safeId(oDescriptor.name), {
			header: oDescriptor.label,
			propertyKey: oDescriptor.name,
			hAlign: /^Edm\.(Byte|SByte|Int16|Int32|Int64|Decimal|Double|Single)$/.test(oDescriptor.edmType) ? "End" : "Begin",
			template: createDisplay(oDescriptor)
		});
	}

	return {
		createDisplay: createDisplay,
		createFilterField: createFilterField,
		createColumn: createColumn,
		formattedValue: formattedValue
	};
});
