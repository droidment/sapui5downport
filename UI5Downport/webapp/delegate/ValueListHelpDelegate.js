sap.ui.define([
	"sap/ui/mdc/ValueHelpDelegate"
], function (ValueHelpDelegate) {
	"use strict";

	// Annotation-driven ValueHelp delegate (POC).
	//
	// Unlike the sibling ValueHelpDelegate.js, the view declares NOTHING about the
	// value list here: the MTable in the view is empty (no keyPath/descriptionPath/
	// filterFields/table). Everything is derived at runtime from the property's
	// com.sap.vocabularies.Common.v1.ValueList annotation, read via the OData V4
	// ODataMetaModel (requestValueListInfo). The annotated property path comes from
	// the ValueHelp payload, e.g. payload: { propertyPath: "/Products/CategoryID" }.
	var Delegate = Object.assign({}, ValueHelpDelegate);

	function loadControls() {
		return new Promise(function (resolve) {
			sap.ui.require([
				"sap/m/Table",
				"sap/m/Column",
				"sap/m/ColumnListItem",
				"sap/m/Text"
			], function (Table, Column, ColumnListItem, Text) {
				resolve({ Table: Table, Column: Column, ColumnListItem: ColumnListItem, Text: Text });
			});
		});
	}

	// Translate a ValueList record into the metadata MDC's MTable needs.
	// - keyPath: the ValueListProperty of the In/InOut/Out parameter (the real key)
	// - displayColumns: every DisplayOnly ValueListProperty (used for description + search)
	// - columns: all parameters' ValueListProperty, in annotation order
	function analyzeValueList(oInfo) {
		var aParams = oInfo.Parameters || [];
		var sKeyPath, aColumns = [], aDisplay = [];
		aParams.forEach(function (oParam) {
			var sType = oParam.$Type || "";
			var sVlp = oParam.ValueListProperty;
			if (!sVlp) {
				return;
			}
			if (aColumns.indexOf(sVlp) === -1) {
				aColumns.push(sVlp);
			}
			if (!sKeyPath && /Parameter(InOut|In|Out)$/.test(sType)) {
				sKeyPath = sVlp;
			} else if (/ParameterDisplayOnly$/.test(sType)) {
				aDisplay.push(sVlp);
			}
		});
		return {
			collectionPath: "/" + oInfo.CollectionPath,
			keyPath: sKeyPath,
			descriptionPath: aDisplay[0] || sKeyPath,
			displayColumns: aDisplay,
			columns: aColumns
		};
	}

	Delegate.retrieveContent = function (oValueHelp, oContainer, sContentId) {
		var oPayload = oValueHelp.getPayload() || {};
		var sPropertyPath = oPayload.propertyPath;
		var aContent = oContainer.getContent() || [];
		var oContent = (sContentId && aContent.filter(function (c) { return c.getId() === sContentId; })[0]) || aContent[0];

		// Nothing to populate, or the table was already built on a prior open.
		if (!oContent || !sPropertyPath || oContent.getTable()) {
			return Promise.resolve();
		}

		var oMetaModel = oValueHelp.getModel().getMetaModel();
		return Promise.all([
			oMetaModel.requestValueListInfo(sPropertyPath),
			loadControls()
		]).then(function (aResult) {
			var mInfo = aResult[0];
			var C = aResult[1];
			if (oContent.getTable()) {
				return; // built concurrently by another open
			}
			var oInfo = mInfo[""] || mInfo[Object.keys(mInfo)[0]];
			var oDef = analyzeValueList(oInfo);

			var oTemplate = new C.ColumnListItem({ type: "Active" });
			oDef.columns.forEach(function (sProp) {
				oTemplate.addCell(new C.Text({ text: "{" + sProp + "}" }));
			});
			// length:100 + no growing mirrors the known-good config: MDC forces
			// extended change detection on the inner table and filters via
			// getContexts(0,100); growing's paged getContexts(0,20) would collide.
			var oTable = new C.Table({
				width: "100%",
				items: { path: oDef.collectionPath, length: 100, template: oTemplate, templateShareable: false }
			});
			oDef.columns.forEach(function (sProp) {
				oTable.addColumn(new C.Column({ header: new C.Text({ text: sProp }) }));
			});

			oContent.setKeyPath(oDef.keyPath);
			oContent.setDescriptionPath(oDef.descriptionPath);
			oContent.setFilterFields("*" + (oDef.displayColumns[0] || oDef.keyPath) + "*");
			oContent.setTable(oTable);
		});
	};

	return Delegate;
});
