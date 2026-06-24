sap.ui.define([
	"sap/ui/mdc/ValueHelpDelegate",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/Text",
	"mdcAnnotation/ValueListResolver"
], function (ValueHelpDelegate, Table, Column, ColumnListItem, Text, ValueListResolver) {
	"use strict";

	var Delegate = Object.assign({}, ValueHelpDelegate);

	Delegate.retrieveContent = function (oValueHelp, oContainer, sContentId) {
		var oPayload = oValueHelp.getPayload() || {};
		var aContent = oContainer.getContent() || [];
		var oContent = (sContentId && aContent.find(function (oCandidate) {
			return oCandidate.getId() === sContentId;
		})) || aContent[0];
		if (!oContent || !oPayload.propertyPath || oContent.getTable()) {
			return Promise.resolve();
		}
		return ValueListResolver.request(oValueHelp.getModel().getMetaModel(), oPayload.propertyPath)
			.then(function (oDefinition) {
				if (oContent.getTable()) { return; }
				var oTemplate = new ColumnListItem({ type: "Active" });
				oDefinition.descriptors.forEach(function (oDescriptor) {
					oTemplate.addCell(new Text({ text: "{" + oDescriptor.path + "}" }));
				});
				var oTable = new Table({
					width: "100%",
					items: {
						path: oDefinition.collectionPath,
						length: 100,
						template: oTemplate,
						templateShareable: false
					}
				});
				oDefinition.descriptors.forEach(function (oDescriptor) {
					oTable.addColumn(new Column({ header: new Text({ text: oDescriptor.label }) }));
				});
				oContent.setKeyPath(oDefinition.keyPath);
				oContent.setDescriptionPath(oDefinition.descriptionPath);
				oContent.setFilterFields("*" + (oDefinition.displayColumns.join(",") || oDefinition.keyPath) + "*");
				oContent.setTable(oTable);
			});
	};

	return Delegate;
});
