# STRUCTURE — Project layout & module guide

The editor is framework-free: each template is a static HTML page that loads one
ESM entry point, `assets/js/editor.js`, which assembles small single-purpose
modules. This file documents how modules are organised and how they fit
together. For the engineering invariants (flatten, group, lock, history), see
`AGENTS.md`.

## High-level layout

```
templates/            static multi-page designs, each loads editor.js
  story/  phone-1/ phone-2/  windows-1/ windows-2/  wedding/  bento/
  debt-ledger/studio/
public/mockups/       device mockup fragments (phone/laptop/monitor) inlined
assets/
  js/                 editor modules (all ESM, split by capability)
  css/site.css        shared chrome + editor-stage styles
dist/                 Vite build output (templates + bundled editor.js)
app/  index.html      thin HTML entry pages
```

## Boot sequence (`editor.js`)

`inject()` runs on `DOMContentLoaded`:

1. `buildUI()` (`ui-config.js`) — injects the editor chrome: top bar, tool rail,
   sidebar with tabs/panes, layers drawer.
2. `bind()` (`events.js`) — wires tool-tab switching, keyboard shortcuts, and
   history commands; returns a cleanup setter for click-to-select behaviour.
3. `renderLogos()` (`logo.js`) / `renderMockups()` (`mockups.js`) / the elements
   pane (`ui-config.js` → `buildElementsPane()` → `elements.js`) — populate the
   sidebar catalogs.
4. `initEditableText()` (`text.js`) — disables spellcheck/draggable on
   `contenteditable` leaves.
5. `await document.fonts.ready`, then flatten → layer stack → canvas scale.

`editor:canvas-restored` (fired by `history.js` undo/redo) resets selection and
re-runs the flatten/stack/scale steps so the DOM is authoritative again.

## Data & constants — `state.js`

- `state` — the single shared mutable object (active element, active range,
  overlay element, modals).
- Thematic catalogs: `TEXT_COLORS`, `FONTS`, `LOGOS`, `MOCKUPS`. The elements
  catalog lives in `elements.js` (it owns its render/insert logic).
- Canvas geometry: `MIN_W`, `MIN_H`, default `MOCKUPS`.

## Layer model — `interactions.js` + `layers.js`

- **`interactions.js`** builds the interactive layer behaviour:
  - `flattenCanvasIntoLayers` absolutises template DOM into independent layers.
    Filter order: `isLayerCandidate` → frame → `isGroupMember` → `GROUP_SELECTOR`
    match. Grouped containers are tagged `data-group`; mockup frames
    (`FRAME_SELECTOR`) stay top-level even inside a group.
  - `makeLayerMovable` attaches drag (`startMove`, from the top-left handle) and
    resize (`startResize`) handles gated by `isLocked`.
  - `selectElement` shows the moving overlay/ring (hidden for text) and toggles
    text-toolbar selection.
  - `updateCanvasScale` centres the scaled canvas, `applyZoom` the zoom step.
  - `groupOf`, `isLayerCandidate`, `canvasRoot`, `canvasStage`.
  - Overlay helpers: `showOverlay`, `hideOverlay`, `positionOverlay`,
    `showToolbarEl`, `sidebarOpen`.
- **`layers.js`** is the layer *descriptor* and drawer engine:
  - Layer selectors: `editableElements`, `frameElements`, `visualLayerElements`,
    `layerElements` (standalone text = editable minus `groupOf(el)`), `groupChildren`.
  - Locking: `isLocked`, `setLocked`, `lockDefault` (non-text default-locked on
    first visit). Locks gate move/resize only.
  - Stacking: `layerZIndex`, `maxLayerZ`, `initLayerStack` (assigns unique
    `z-index` across top-level layers + group children).
  - Drawer: `renderLayers` / `renderGroupRow` / `buildRow` renders expandable
    group rows (adding `.lay-chev` / `.lay-children`); `markerFor`,
    `reorderLayers`, `resolveMarker` implement z-marker reordering that
    bypasses locks.
  - `describe` for human-readable row labels.

## Sidebar tools & events — `events.js`, `ui-config.js`

- `events.js` owns the `TOOL_PANES` map (`templates`, `elements`, `text`,
  `uploads=null`, `brand→'logo'`, `layers`), pane activation, the top-rail
  click handling, and `runHistoryCommand('undo'|'redo')`. Selection activates an
  element and shows the relevant toolbar/overlay.
- `ui-config.js` builds the chrome DOM (including the `#elementsPane`), injects
  editor CSS (layer ring 5s spin, `.lay-chev`, elements grid), and mounts the
  sidebar tabs.

## Feature modules

- `elements.js` — "العناصر": `ELEMENTS` catalog (~50 static items, 8 categories),
  `buildElementsPane()` (search + category tabs + grid), `insertElement(id)`
  which creates an absolutely-centred layer, calls `record()` before mutating,
  `lockDefault`, `makeLayerMovable`, `selectElement`, `renderLayers`,
  `updateCanvasScale`.
- `mockups.js` — device mockups and upload wiring; `wireMockupUpload` revokes
  the previous blob URL and resets the input so re-selecting the same file works.
- `logo.js` — logo catalog / insertion.
- `text.js` — text selection toolbar (color/font/bold/resize) via
  `setColor`/`setFont`/`toggleBold`/`resizeFont`, plus `initEditableText`.
- `history.js` — snapshot-based undo/redo: `record()` pushes a snapshot before a
  mutating action (do NOT mutate before calling it); `undo()`/`redo()` restore
  and dispatch `editor:canvas-restored`; `resetHistory()` clears.
- `helpers.js` — shared utils (`swatchHtml`, `rgbToHex`, `currentFontSize`,
  `normalizeFamilyName`, `isEditableTarget`).

## Build & verification

- `npm run build` → bundles `assets/js/editor.js` into `dist/assets/editor-*.js`;
  `dist/` templates reference it. `node --check assets/js/<file>.js` syntax-checks
  a module. Headless-Chrome CDP harnesses under `/tmp/opencode/` smoke-test
  selection / move / resize / lock / reorder / undo-redo / element insertion on
  the dev server (`npx vite --port 5198`).
- Read drawer row fields with `:scope > .lay-*`; a group row contains a nested
  child `<li>`, so a plain `.querySelector('.lay-tag')` matches the child first.