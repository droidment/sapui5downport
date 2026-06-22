# UI5Downport — Session Handoff

> Written for a fresh Claude Code session picking this up on a **Windows** machine.
> Read this top to bottom before touching code. It captures the goal, the hard
> constraints, how to run it, the Windows gotchas, and exactly where the one
> open task (the async runner) needs your work.

---

## 1. What this project is

A **freestyle / custom SAPUI5 app** (NOT Fiori Elements) that demonstrates
**downporting** the `sap.ui.mdc` ValueHelp + FilterBar + Table stack — plus an
annotation-driven Object Page — to **OpenUI5 1.120.30**, running against a
**real, live OData V4 service (Northwind)**.

Two pages:
1. **Main** — an MDC `FilterBar` + MDC `Table` over `Products`, with per-field
   `ValueHelp` (Category value help is annotation-driven via `Common.ValueList`).
   Row press navigates to the Object Page. The table is **multi-select** with two
   toolbar actions (**Active Work** / **Passive Work**) that fan out to the async
   runner — one job per selected row — and there is a custom **"In WIP"** switch
   filter that the `TableDelegate` ANDs into the `$filter` query on search (see §7).
2. **Object Page** (`sap.uxap`) — annotation-driven: header from `UI.HeaderInfo`,
   one section per `UI.Facets` ReferenceFacet, each section's content built from
   `UI.FieldGroup` / `UI.LineItem`. Sections are **lazy** (data fetched only when
   a tab is opened). Each section is a real `sap.uxap.BlockBase` block in its own
   folder. Each block has a **custom action button** driven by
   `UI.DataFieldForAction` (see §7 — this is the live handoff item).

---

## 2. Standing constraints — DO NOT violate these

These are user rules carried across sessions. They override convenience.

- **OpenUI5 1.120.30** is the target. Don't use APIs newer than 1.120.
- **Freestyle only. Do NOT use or recommend `sap.fe.macros`** (that's Fiori
  Elements). Custom UI uses a custom MDC delegate route reading annotations via
  `ODataMetaModel` (e.g. `requestValueListInfo`).
- **Real OData V4, never JSON mock.** The live backend is Northwind V4
  (`services.odata.org`), reached same-origin through the dev proxy (see §3).
- **"Use annotations as much as possible."** Field lists, labels, sections,
  columns, header, and the custom actions are all read from annotations at
  runtime. Nothing about *which* fields/actions exist is hard-coded.
- The user is an experienced SAP Fiori dev (OData V4, annotations, MDC). Speak
  in those terms; don't over-explain basics.

---

## 3. How to run it (Windows)

The dev server is a single Python 3 file, `UI5Downport/server.py`. It serves the
static app from `webapp/` **and reverse-proxies** the OData V4 service so the
browser talks to it same-origin (Northwind rejects the CORS preflight that the
V4 model's headers trigger; the proxy sidesteps CORS entirely and also fixes a
malformed `OData-Version` header from the service).

```
cd UI5Downport
python server.py        # Windows: usually `python`, not `python3`
```

Then open: **http://127.0.0.1:8181/** (or `/index.html`).

- Port is **8181** (hardcoded in `server.py`).
- Needs **internet**: UI5 loads from the CDN
  `https://sdk.openui5.org/1.120.30/resources/sap-ui-core.js`, and the proxy
  forwards `/odata/*` to `https://services.odata.org/*`.
- `server.py` sets `Cache-Control: no-store` on every response (dev-only) so the
  V4 `ODataMetaModel` never re-reads a stale `annotations.xml` after edits. This
  means **a plain browser reload picks up your code changes** — no cache-busting
  dance needed.

### Preview tooling (if available in your session)
`.claude/launch.json` defines a server named **`ui5downport`** (`python3 server.py`,
port 8181). On Windows you may need to change `runtimeExecutable` from `python3`
to `python`. If you use a Preview MCP, it can reuse/own the server on 8181.

---

## 4. Git workflow + caveats

- Remote: `https://github.com/droidment/sapui5downport.git`, branch **`main`**.
- The committed content lives under a top-level **`UI5Downport/`** directory in
  the repo. A clean clone gives you `…/UI5Downport/server.py`, `…/UI5Downport/webapp/…`.
- **Run `git status` and `git remote -v` first** to confirm where the repo root is.
  On the original Mac working copy the git root was a *shared parent folder* that
  also contained many unrelated sibling projects (untracked). There, you had to
  stage **only `UI5Downport/` paths explicitly — never `git add -A` / `git add .`**
  (it would sweep in unrelated projects). On a fresh clone this isn't an issue,
  but verify before bulk-adding.
- **Line endings:** source files use **tabs** for indentation and **LF** line
  endings. On Windows, set `git config core.autocrlf false` (or `input`) in this
  repo to avoid a whole-file CRLF diff. Keep tabs, not spaces, to match the style.
- Commit style: descriptive multi-line messages with a
  `Co-Authored-By: Claude …` trailer. Only commit when the user asks.
- Note: commits so far were authored as `rajbala@rajs-mac-mini.lan` because no
  `user.name`/`user.email` is configured. Not a blocker; set yours if you like.

### Commit history (most recent first)
```
<this commit> Add Main-page custom WIP filter, multi-select + Active/Passive Work actions  <-- latest
07e69ca Add session handoff doc for Windows pickup
f6200a7 Add annotation-driven custom block actions via async runner seam
b3ee988 Refactor Object Page sections into lazy-loading uxap BlockBase blocks
450c33a Add MDC FilterBar + Table + ValueHelp downport on OpenUI5 1.120.30 (OData V4 Northwind)
```

---

## 5. Architecture map

```
UI5Downport/
  server.py                       Dev server + OData V4 reverse proxy (port 8181, no-store)
  HANDOFF.md                      <- this file
  webapp/
    index.html                    Bootstrap: UI5 1.120.30 CDN, libs sap.m + sap.ui.mdc, on-init -> index.js
    index.js                      Creates the ComponentContainer (component id "downport")
    Component.js                  UIComponent; explicit getRouter().initialize()
    manifest.json                 Routing, model, dataSources. KEY: model "" has
                                  operationMode "Server" + groupId "$direct" and NO
                                  autoExpandSelect (see §6). dataSource northwind ->
                                  /odata/V4/Northwind/Northwind.svc/ + localAnnotations.
    localService/
      annotations.xml             ALL UI annotations live here (labels, ValueList,
                                  HeaderInfo, FieldGroups, Facets, LineItem,
                                  DataFieldForAction). Edit here to change the UI.
    view/
      App.view.xml                Root: <App id="app"/> (routing target container)
      Main.view.xml               MDC FilterBar + "In WIP" Switch (Toolbar) + multi-select
                                  MDC Table with mdc:actions (Active/Passive Work buttons)
      ObjectPage.view.xml         Page > ObjectPageLayout (useIconTabBar) > ObjectPageHeader
      ActiveWork.view.xml         Plain sap.m.Table filtered view (route "activework"),
                                  reached after the Main "Active Work" action completes
    controller/
      Main.controller.js          FilterBar/Table wiring; onProductPress -> navTo("object").
                                  Holds "In WIP" state in an unnamed-view "ui" JSON model
                                  (/inWIP). onWIPChange re-triggers FilterBar search.
                                  onActiveWork/onPassiveWork -> _runForSelected: one
                                  AsyncActionRunner.run() per getSelectedContexts() row,
                                  Promise.all -> summary toast, then clearSelection().
      ObjectPage.controller.js    Reads HeaderInfo + Facets; builds header; creates one
                                  ObjectPageSection per ReferenceFacet, each hosting a Block
      ActiveWork.controller.js    Nav only: onNavBack -> "main"; onProductPress -> "object"
    delegate/                     Custom MDC delegates (the "no fe.macros" route)
      TableDelegate.js            MDC Table over OData V4 Products. updateBindingInfo reads
                                  ui>/inWIP and (when on) pushes WIP_FILTER (UnitsOnOrder gt 0)
                                  into oBindingInfo.filters AFTER super, AND-joining the $filter
      FilterBarMainDelegate.js    Main FilterBar fetchProperties
      FilterBarDelegate.js        Value-help inner FilterBar delegate
      ValueHelpDelegate.js        ValueHelp content
      ValueListHelpDelegate.js    Annotation-driven value help (builds MTable from ValueList)
    blocks/                       One folder per Object Page section (BlockBase blocks)
      generalinformation/         FieldGroup#General  -> form + "Duplicate Product" action
        GeneralInformationBlock.js   BlockBase subclass (metadata.views Collapsed/Expanded)
        GeneralInformation.view.xml  Toolbar(actions) + SimpleForm(form)
        GeneralInformation.controller.js
      stockpricing/               FieldGroup#Stock    -> form + "Reorder Stock" action
        (Block.js / .view.xml / .controller.js, same shape)
      orderdetails/               Order_Details LineItem -> table + "Create New Order" action
        (Block.js / .view.xml / .controller.js)
    util/
      AsyncActionRunner.js        *** THE SEAM you plug your runner into — see §7 ***
      BlockActions.js             Turns UI.DataFieldForAction records into runner-wired buttons
```

---

## 6. How the annotation-driven Object Page works (and the two non-obvious bits)

- `ObjectPage.controller.js` reads `/Products/@UI.HeaderInfo` and
  `/Products/@UI.Facets` via the `ODataMetaModel`. Title/subtitle bind to the
  `$Path`s in HeaderInfo. It creates one `ObjectPageSection` per `ReferenceFacet`
  and maps the facet's `Target` annotation path to a block module
  (`_blockForFacet`: `FieldGroup#General` → GeneralInformationBlock, `#Stock` →
  StockPricingBlock, `LineItem` → OrderDetailsBlock).
- **Lazy loading** is native: under `ObjectPageLayout useIconTabBar="true"`, a
  block's inner XML view is instantiated only when its tab is displayed (first
  tab eager). Each block's controller builds its content on `onBeforeRendering`
  and fires that section's request then.
- **Gotcha A — no `autoExpandSelect`:** the model does not auto-load
  non-selected properties (requesting one returns `undefined` with no request).
  So each field-group block creates its **own** `oForm.bindElement({ path,
  parameters:{ $select: <just this section's fields> } })`, which is what issues
  the deferred `GET /Products(id)?$select=…` when the tab opens. **Bind BEFORE
  adding the value `Text`s** or you get transient "invalid segment" drill-down
  errors against the header-only context.
- **Gotcha B — `$$ownRequest`:** the Order Details table is a *relative* list
  binding (`Order_Details`). The product context never `$expand`ed it, so the
  binding needs `parameters:{ $$ownRequest:true }` to issue its own
  `GET /Products(id)/Order_Details`.
- **Gotcha C — refreshing the table:** a relative list binding (even with
  `$$ownRequest`) is **not a root binding**, so `binding.refresh()` throws
  *"Refresh on this binding is not supported."* Refresh via
  `binding.getRootBinding().refresh()` instead (already done in
  `OrderDetails.controller.js` `_buildActions` onSuccess).

---

## 7. *** ACTIVE HANDOFF ITEM: the async action runner ***

The custom block actions are wired but run against a **simulated** backend. The
user has their **own async runner** (it triggers an action, then polls for
success/failure — it is NOT a plain OData action POST) and wants it plugged in.

### What's already built
- Each block renders a button from a `UI.DataFieldForAction` annotation:
  - General Information → **Duplicate Product** (`downport.action.DuplicateProduct`)
  - Stock & Pricing → **Reorder Stock** (`downport.action.ReorderStock`)
  - Order Details → **Create New Order** (`downport.action.CreateOrder`, in the
    table header toolbar; on success it refreshes the rows)
- `util/BlockActions.js` reads those records and builds buttons. Each press
  routes through `AsyncActionRunner.run(...)` with busy state, progress on the
  tooltip, a success `MessageToast`, and a failure `MessageBox`.
- The blocks call **only** `AsyncActionRunner.run(...)`. They know nothing about
  how an action is triggered or polled. That decoupling is intentional.

### What YOU need to do — edit `webapp/util/AsyncActionRunner.js`
Replace the bodies of the two methods marked `>>> SEAM` with calls to the real
runner. Everything else (the `run()` orchestration: interval, timeout,
`maxAttempts`, `onProgress`) stays as-is.

- **`_trigger(o)`** must return `Promise<{ jobId }>` — kick off the action.
- **`_poll(jobId, o)`** must return `Promise<{ status, result, error }>` where
  `status` is one of `"running" | "success" | "failed"`.

Both methods currently contain a stub (fake `jobId`, ~3 "running" polls then
"success") and a copy-pasteable `fetch` example in the comments. `run({ actionId,
label, context, payload, onProgress, options })` resolves with the action result
or rejects with an `Error`.

### The Main page ALSO routes through the same runner
The Products MDC Table is multi-select (`selectionMode="Multi"`) with two
`mdc:actions` buttons — **Active Work** (`downport.action.ActiveWork`) and
**Passive Work** (`downport.action.PassiveWork`). On press,
`Main.controller.js` `_runForSelected` reads `oTable.getSelectedContexts()` and
fires **one `AsyncActionRunner.run()` per selected row** (payload carries that
row's `productId` + context path), disables both buttons, then `Promise.all`s
the jobs and shows a summary toast (`"… done: N succeeded, M failed"`) before
re-enabling and clearing the selection. So when you swap in the real runner
(§7 above), these buttons light up too — no extra wiring. Verified live: 2
selected rows → 2 runner jobs → `"Passive Work done: 2 succeeded"`. **Active Work
additionally navigates** (after all jobs finish) to the `activework` route — a
filtered Products view (`view/ActiveWork.*`, "Low Stock" = `UnitsInStock < 20`,
filter declared inline on the sap.m.Table items binding). `_runForSelected`
takes an optional `fnDone` callback for exactly this; Passive Work passes none.

### The custom "In WIP" switch filter (NOT an MDC FilterField)
MDC `FilterBar` only hosts `FilterField`s, so "In WIP" is a plain `sap.m.Switch`
in a `Toolbar` below the FilterBar, bound to `ui>/inWIP`. The mechanism:
1. `onWIPChange` calls `oFilterBar.triggerSearch()` so the table rebinds.
2. `TableDelegate.updateBindingInfo` runs the **stock** V4 delegate first (that
   turns the FilterBar conditions into `oBindingInfo.filters`), then reads
   `oTable.getModel("ui").getProperty("/inWIP")` and, when true, pushes
   `WIP_FILTER` onto `oBindingInfo.filters` — AND-joining it into `$filter`.
3. `WIP_FILTER = new Filter("UnitsOnOrder", FilterOperator.GT, 0)`. **To repoint
   the switch at a different field, change that one line** in `TableDelegate.js`.
   (`UnitsOnOrder` is a real Northwind Product property; it is intentionally NOT
   declared in `fetchProperties`/`FilterBarMainDelegate` — a raw model `Filter`
   filters on it fine without being a surfaced MDC column.)
Verified live: toggling on issues `GET /Products?$count=true&$filter=UnitsOnOrder gt 0…`
and the row count drops (77 → 17).

### Things the user may also want (ASK, don't assume)
- **Real action ids:** the `Action` strings in `annotations.xml` are placeholders
  the runner maps. Rename to match the real backend action keys.
- **Input collection:** "Create New Order" currently sends no payload. If it
  should collect order fields (quantity, etc.), build a dialog that feeds
  `o.payload`. Not built yet.
- **Polling cadence:** defaults are `intervalMs: 1200`, `maxAttempts: 40`,
  `timeoutMs: 0` (rely on maxAttempts). Override per-call via `options`.

---

## 8. Annotation metamodel reference (proven paths)

All read via `oView.getModel().getMetaModel().getObject(<path>)`:

```
/Products/@com.sap.vocabularies.UI.v1.HeaderInfo
/Products/@com.sap.vocabularies.UI.v1.Facets
/Products/@com.sap.vocabularies.UI.v1.FieldGroup#General        .Data -> [ DataField | DataFieldForAction ]
/Products/@com.sap.vocabularies.UI.v1.FieldGroup#Stock          .Data -> [ … ]
/Products/<prop>@com.sap.vocabularies.Common.v1.Label
/Products/Order_Details/@com.sap.vocabularies.UI.v1.LineItem     -> [ DataField | DataFieldForAction ]
/Products/Order_Details/<prop>@com.sap.vocabularies.Common.v1.Label
NorthwindModel.Product/CategoryID  @Common.ValueList            (annotation-driven value help)
```

Record discriminators (the `$Type` you filter on):
- `com.sap.vocabularies.UI.v1.DataField` — has `.Value.$Path` (a field/column)
- `com.sap.vocabularies.UI.v1.DataFieldForAction` — has `.Label` + `.Action` (a button)

---

## 9. Verifying changes live

- With `no-store`, just reload the browser after editing.
- Drive/inspect via the UI5 runtime in the page console (or a Preview MCP):
  - Component: `sap.ui.require("sap/ui/core/Component").registry.get("downport")`
  - Navigate: `…getRouter().navTo("object", { productId: 3 })`
  - Inspect requests: `performance.getEntriesByType("resource").filter(r => /Products/.test(r.name))`
- Object Page sections regenerate per navigation; section ids like `__section7/9/11`
  change each rebuild — match by title, not id.
- The async flow was verified end-to-end with the simulated runner: button
  busy → progress phases `triggering → polling:1..3 → succeeded` → success toast →
  Order Details table refresh fired a new `Order_Details` GET, no errors.
- Main-page features verified live: the "In WIP" switch ANDs `UnitsOnOrder gt 0`
  into the `$filter` (row count 77 → 17); inner table is `MultiSelect`;
  selecting 2 rows + Passive Work fired 2 runner jobs (one per row) and toasted
  `"Passive Work done: 2 succeeded"`, then cleared the selection.

---

## 10. Known BENIGN console noise (ignore these)

- `failed to load … downport/Component-preload.js` (404) — there's no preload
  bundle in dev; UI5 falls back to individual modules. Expected.
- `Connector (LrepConnector) failed call 'loadFlexData' / 'loadFeatures': File
  not found` — `flexEnabled:true` in the manifest makes UI5 look for flexibility
  data that doesn't exist in this static dev setup. Harmless.

If you see anything else (especially "invalid segment" drill-down errors or
"Refresh on this binding is not supported"), that's a real regression — see §6.

---

## 11. Suggested next steps (in likely priority order)

1. **Plug in the real async runner** (§7) — the main reason for this handoff.
2. Decide real `Action` ids + whether "Create New Order" needs an input dialog.
3. Optional polish: Category/Supplier on the Object Page show raw IDs because no
   `Common.Text` / value-list text is resolved there — wire descriptions if wanted.
4. Optional: make rendering honor `DataFieldFor*` variants / EDM types instead of
   plain `Text` for every field.
