sap.ui.define([
	"sap/uxap/ObjectPageLayout",
	"sap/uxap/ObjectPageLayoutRenderer",
	"sap/uxap/ObjectPageHeader",
	"sap/uxap/ObjectPageSection",
	"sap/uxap/ObjectPageSubSection",
	"sap/m/VBox",
	"sap/m/Toolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/Button",
	"sap/ui/layout/form/SimpleForm",
	"sap/m/Label",
	"sap/ui/mdc/table/ResponsiveTableType",
	"downport/annotation/AnnotationResolver",
	"downport/annotation/FieldFactory",
	"downport/annotation/AnnotationTable"
], function (ObjectPageLayout, ObjectPageLayoutRenderer, ObjectPageHeader, ObjectPageSection, ObjectPageSubSection,
	VBox, Toolbar, ToolbarSpacer, Button, SimpleForm, Label, ResponsiveTableType,
	Resolver, FieldFactory, AnnotationTable) {
	"use strict";

	var REFERENCE_FACET = "com.sap.vocabularies.UI.v1.ReferenceFacet";
	var COLLECTION_FACET = "com.sap.vocabularies.UI.v1.CollectionFacet";

	var AnnotationObjectPage = ObjectPageLayout.extend("downport.annotation.AnnotationObjectPage", {
		metadata: {
			properties: {
				contextPath: { type: "string" },
				headerInfoPath: { type: "string", defaultValue: "@com.sap.vocabularies.UI.v1.HeaderInfo" },
				facetsPath: { type: "string", defaultValue: "@com.sap.vocabularies.UI.v1.Facets" }
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
		renderer: ObjectPageLayoutRenderer
	});

	AnnotationObjectPage.prototype.init = function () {
		ObjectPageLayout.prototype.init.apply(this, arguments);
		this.setUseIconTabBar(true);
		this.setShowTitleInHeaderContent(false);
		this.attachNavigate(this._onNavigate, this);
		this._aFacetDefinitions = [];
	};

	AnnotationObjectPage.prototype.onBeforeRendering = function () {
		if (ObjectPageLayout.prototype.onBeforeRendering) {
			ObjectPageLayout.prototype.onBeforeRendering.apply(this, arguments);
		}
		this._ensureStructure();
	};

	AnnotationObjectPage.prototype._ensureStructure = function () {
		var oModel = this.getModel();
		if (this._pStructure || !oModel || !this.getContextPath()) {
			return this._pStructure || Promise.resolve();
		}
		var that = this;
		var oMetaModel = oModel.getMetaModel();
		this._pStructure = Promise.all([
			Resolver.requestAnnotation(oMetaModel, this.getContextPath(), this.getHeaderInfoPath()),
			Resolver.requestAnnotation(oMetaModel, this.getContextPath(), this.getFacetsPath())
		]).then(function (aValues) {
			that._buildHeader(aValues[0]);
			that._buildSections(aValues[1] || []);
		});
		return this._pStructure;
	};

	AnnotationObjectPage.prototype._buildHeader = function (oHeaderInfo) {
		var oHeader = new ObjectPageHeader();
		this._aHeaderPaths = [];
		var sTitle = oHeaderInfo && oHeaderInfo.Title && Resolver.dataFieldPath(oHeaderInfo.Title);
		var sDescription = oHeaderInfo && oHeaderInfo.Description && Resolver.dataFieldPath(oHeaderInfo.Description);
		if (sTitle) {
			oHeader.bindProperty("objectTitle", { path: sTitle });
			this._aHeaderPaths.push(sTitle);
		}
		if (sDescription) {
			oHeader.bindProperty("objectSubtitle", { path: sDescription });
			this._aHeaderPaths.push(sDescription);
		}
		this.setHeaderTitle(oHeader);
	};

	AnnotationObjectPage.prototype._buildSections = function (aFacets) {
		var that = this;
		this.destroySections();
		this._aFacetDefinitions = [];
		function addFacet(oFacet, sParentLabel) {
			if (!oFacet) { return; }
			if (oFacet.$Type === COLLECTION_FACET) {
				(oFacet.Facets || []).forEach(function (oChild) {
					addFacet(oChild, oFacet.Label || sParentLabel);
				});
				return;
			}
			if (oFacet.$Type !== REFERENCE_FACET || !oFacet.Target || !oFacet.Target.$AnnotationPath) {
				Resolver.warnUnsupported("facet", oFacet);
				return;
			}
			var oHost = new VBox({ width: "100%" });
			var oSection = new ObjectPageSection({
				title: oFacet.Label || sParentLabel || "",
				subSections: [new ObjectPageSubSection({ blocks: [oHost] })]
			});
			oSection.data("annotationFacetIndex", that._aFacetDefinitions.length);
			that._aFacetDefinitions.push({ facet: oFacet, host: oHost, section: oSection, built: false });
			that.addSection(oSection);
		}
		(aFacets || []).forEach(function (oFacet) { addFacet(oFacet, ""); });
	};

	AnnotationObjectPage.prototype.bindEntity = function (sEntityPath) {
		var that = this;
		this.setBusy(true);
		return this._ensureStructure().then(function () {
			that._resetFacetContent();
			that.bindElement({
				path: sEntityPath,
				parameters: Resolver.queryOptions(that._aHeaderPaths)
			});
			if (that._aFacetDefinitions[0]) {
				return that._buildFacet(that._aFacetDefinitions[0]);
			}
		}).finally(function () { that.setBusy(false); });
	};

	AnnotationObjectPage.prototype._resetFacetContent = function () {
		this._aFacetDefinitions.forEach(function (oDefinition) {
			oDefinition.host.destroyItems();
			oDefinition.built = false;
		});
	};

	AnnotationObjectPage.prototype._onNavigate = function (oEvent) {
		var oSection = oEvent.getParameter("section");
		var iIndex = oSection && oSection.data("annotationFacetIndex");
		if (iIndex !== undefined) {
			this._buildFacet(this._aFacetDefinitions[iIndex]);
		}
	};

	AnnotationObjectPage.prototype._buildFacet = function (oDefinition) {
		if (!oDefinition || oDefinition.built) { return Promise.resolve(); }
		oDefinition.built = true;
		var sTarget = oDefinition.facet.Target.$AnnotationPath;
		if (sTarget.indexOf("@com.sap.vocabularies.UI.v1.FieldGroup") !== -1) {
			return this._buildFieldGroup(oDefinition.host, sTarget);
		}
		if (sTarget.indexOf("@com.sap.vocabularies.UI.v1.LineItem") !== -1) {
			return this._buildLineItem(oDefinition.host, sTarget, oDefinition.facet.Label);
		}
		Resolver.warnUnsupported("facet target", { $Type: sTarget });
		return Promise.resolve();
	};

	AnnotationObjectPage.prototype._buildFieldGroup = function (oHost, sTarget) {
		var that = this;
		var oMetaModel = this.getModel().getMetaModel();
		return Resolver.requestAnnotation(oMetaModel, this.getContextPath(), sTarget).then(function (oFieldGroup) {
			var aData = oFieldGroup && oFieldGroup.Data || [];
			var aFieldRecords = aData.filter(function (oRecord) { return oRecord.$Type === Resolver.DATA_FIELD; });
			return Promise.all(aFieldRecords.map(function (oRecord) {
				var sPath = Resolver.dataFieldPath(oRecord);
				return Resolver.requestProperty(oMetaModel, that.getContextPath(), sPath).then(function (oDescriptor) {
					return Resolver.applyDataField(oDescriptor, oRecord);
				});
			})).then(function (aDescriptors) {
				var oForm = new SimpleForm({
					editable: false,
					layout: "ResponsiveGridLayout",
					columnsL: 2,
					columnsM: 2
				});
				var oContext = that.getBindingContext();
				if (oContext) {
					var aPaths = [];
					aDescriptors.forEach(function (oDescriptor) {
						aPaths.push(oDescriptor.path);
						if (oDescriptor.textPath) { aPaths.push(oDescriptor.textPath); }
					});
					oForm.bindElement({ path: oContext.getPath(), parameters: Resolver.queryOptions(aPaths) });
				}
				aDescriptors.filter(function (oDescriptor) { return !oDescriptor.hidden; }).forEach(function (oDescriptor) {
					oForm.addContent(new Label({ text: oDescriptor.label }));
					oForm.addContent(FieldFactory.createDisplay(oDescriptor));
				});
				var aActions = aData.filter(function (oRecord) { return oRecord.$Type === Resolver.DATA_FIELD_FOR_ACTION; });
				if (aActions.length) {
					var oToolbar = new Toolbar({ content: [new ToolbarSpacer()] });
					aActions.forEach(function (oAction) {
						var oButton = new Button({
							text: oAction.Label || oAction.Action,
							type: "Emphasized",
							press: function () {
								var oActionContext = oForm.getBindingContext() || that.getBindingContext();
								that.fireAnnotationAction({
									actionId: oAction.Action,
									label: oAction.Label || oAction.Action,
									contexts: oActionContext ? [oActionContext] : [],
									sourceControl: oButton
								});
							}
						});
						oToolbar.addContent(oButton);
					});
					oHost.addItem(oToolbar);
				}
				oHost.addItem(oForm);
			});
		});
	};

	AnnotationObjectPage.prototype._buildLineItem = function (oHost, sTarget, sLabel) {
		var that = this;
		var iAnnotation = sTarget.indexOf("@");
		var sNavigationPath = sTarget.substring(0, iAnnotation).replace(/\/$/, "");
		var sMetaPath = sTarget.substring(iAnnotation);
		var oTable = new AnnotationTable({
			contextPath: this.getContextPath() + "/" + sNavigationPath,
			metaPath: sMetaPath,
			collectionPath: sNavigationPath,
			ownRequest: true,
			header: sLabel || "",
			showRowCount: true,
			autoBindOnInit: true,
			p13nMode: ["Column", "Sort"],
			type: new ResponsiveTableType({ growingMode: "Scroll" })
		});
		oTable.attachAnnotationAction(function (oEvent) {
			that.fireAnnotationAction(oEvent.getParameters());
		});
		oHost.addItem(oTable);
		return oTable._ensureBuilt();
	};

	return AnnotationObjectPage;
});
