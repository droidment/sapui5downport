sap.ui.define([
	"downport/annotation/AnnotationResolver",
	"downport/annotation/FieldFactory",
	"downport/annotation/ValueListResolver"
], function (Resolver, FieldFactory, ValueListResolver) {
	"use strict";

	QUnit.module("AnnotationResolver");

	QUnit.test("resolves relative and absolute annotation paths", function (assert) {
		assert.strictEqual(
			Resolver.annotationPath("/Products", "@com.sap.vocabularies.UI.v1.LineItem"),
			"/Products/@com.sap.vocabularies.UI.v1.LineItem"
		);
		assert.strictEqual(Resolver.annotationPath("/Products", "/Suppliers/@UI.LineItem"), "/Suppliers/@UI.LineItem");
	});

	QUnit.test("extracts selection fields in annotation order", function (assert) {
		assert.deepEqual(Resolver.selectionFieldPaths([
			{ $PropertyPath: "Name" },
			{ $PropertyPath: "Category/ID" }
		]), ["Name", "Category/ID"]);
	});

	QUnit.test("converts selection variants into model filters", function (assert) {
		var aFilters = Resolver.selectionVariantFilters({
			SelectOptions: [{
				PropertyName: { $PropertyPath: "UnitsInStock" },
				Ranges: [{ Option: "com.sap.vocabularies.UI.v1.SelectionRangeOptionType/LT", Low: 20 }]
			}]
		});
		assert.strictEqual(aFilters.length, 1);
		assert.strictEqual(aFilters[0].getPath(), "UnitsInStock");
		assert.strictEqual(aFilters[0].getOperator(), "LT");
		assert.strictEqual(aFilters[0].getValue1(), 20);
	});

	QUnit.test("builds select and expand query options", function (assert) {
		assert.deepEqual(Resolver.queryOptions([
			"ProductID",
			"Category/CategoryName",
			"Supplier/CompanyName"
		]), {
			$select: "ProductID",
			$expand: "Category($select=CategoryName),Supplier($select=CompanyName)"
		});
	});

	QUnit.test("formats Common.Text arrangements", function (assert) {
		assert.strictEqual(FieldFactory.formattedValue(1, "Beverages", "TextOnly"), "Beverages");
		assert.strictEqual(FieldFactory.formattedValue(1, "Beverages", "TextLast"), "1 (Beverages)");
	});

	QUnit.test("derives value-list columns and key", function (assert) {
		var oDefinition = ValueListResolver.analyze({
			CollectionPath: "Categories",
			Parameters: [
				{ $Type: "com.sap.vocabularies.Common.v1.ValueListParameterInOut", ValueListProperty: "CategoryID" },
				{ $Type: "com.sap.vocabularies.Common.v1.ValueListParameterDisplayOnly", ValueListProperty: "CategoryName" }
			]
		});
		assert.strictEqual(oDefinition.collectionPath, "/Categories");
		assert.strictEqual(oDefinition.keyPath, "CategoryID");
		assert.strictEqual(oDefinition.descriptionPath, "CategoryName");
		assert.deepEqual(oDefinition.columns, ["CategoryID", "CategoryName"]);
	});

	QUnit.start();
});
