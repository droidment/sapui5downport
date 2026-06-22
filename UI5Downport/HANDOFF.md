# UI5Downport — Annotation Runtime Handoff

## Runtime

- Custom SAPUI5 application pinned to SAPUI5 1.120.30.
- No Fiori elements templates, `sap.fe.macros`, `sap.fe.core`, or private FE runtime modules.
- Live Northwind OData V4 service through the same-origin proxy in `server.py`.
- Run with `python server.py`, then open `http://127.0.0.1:8181/`.

## Annotation architecture

The `webapp/annotation/` library owns the reusable annotation runtime:

- `AnnotationResolver` normalizes metadata paths, property descriptors, restrictions,
  selection variants, and OData query options.
- `AnnotationFilterBar` creates initial filter fields from `UI.SelectionFields`.
- `AnnotationTable` creates columns and toolbar actions from `UI.LineItem`.
- `AnnotationObjectPage` creates the header and lazy sections from `UI.HeaderInfo`,
  `UI.Facets`, `UI.FieldGroup`, and child `UI.LineItem` annotations.
- MDC delegates under `annotation/delegate/` provide personalization, binding, and
  annotation-generated value-help behavior.
- `ActionExecutor` maps logical `DataFieldForAction` records through the existing
  `AsyncActionRunner`; non-OData behavior lives in `ActionConfig`.

Page XML contains annotation paths and layout configuration only. Business property
lists, labels, filters, and action definitions live in `localService/annotations.xml`.

## Current annotation surfaces

- Main filter bar: `UI.SelectionFields`
- Main table: `UI.LineItem`
- WIP toggle: `UI.SelectionVariant#InWIP`
- Active Work table: `UI.LineItem#ActiveWork`
- Active Work filter: `UI.SelectionVariant#LowStock`
- Object Page: `UI.HeaderInfo`, `UI.Facets`, `UI.FieldGroup#General`,
  `UI.FieldGroup#Stock`, and `Order_Details/UI.LineItem`
- Product, Category, and Supplier value helps: `Common.ValueList`
- Category and Supplier descriptions: `Common.Text` with `TextArrangement`

## Verification

The browser-verified flow covers annotation-generated filters and columns, WIP,
value helps, personalization, all five simulated async actions, Active Work routing,
Object Page lazy facets, and the child Order Details table.

Resolver unit tests are available at:

`http://127.0.0.1:8181/test/unit/unitTests.qunit.html`

The async backend remains simulated. Replace `_trigger` and `_poll` in
`webapp/util/AsyncActionRunner.js` when the real runner endpoints are available.
