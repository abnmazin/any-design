# Plan: AI icon picker in the Brand (العلامة) pane

## Goal

Add an **AI icon selection** tool to the brand icons pane, next to the manual
grid. The AI reads the *text of the box* containing the currently-selected icon
(feature-card heading, main brand title, ledger heading, …) and picks the
catalog icon that best fits that text — then applies it exactly like clicking a
grid tile.

## How it works

1. In the brand pane, above `#logoGrid`, render an "أيقونة بالوصف" tool box
   with a generate + regenerate button + status line (mirrors the colors tool).
2. On click, the client extracts the selected target's box text from the DOM,
   slices the icon catalogue to the active category (or full 250 when "الكل"),
   and POSTs to the new proxy route **`/api/ai/icon`**
   `{ prompt: <boxText>, icons: [<codenames>], options: { temperature: 0.4, variation } }`.
3. The server asks the model to return one codename from the provided list as
   `{"icon": "<codename>"}`, validates it against the sent list, and returns
   `{ icon: "fa-<codename>", usedModel }`.
4. The client applies the icon to the selected `<i>` target and highlights the
   matching grid tile (same code path as a manual click), with busy/ok/err UI.

## Files & changes

### 1. `vite.config.js` — add the `icon` route
- Dispatch `'icon'` for `/api/ai/icon` alongside `fill`/`colors`.
- Parse an optional `icons` array from the body: sanitize each entry with
  `/^[\w-]+$/`, lowercase, dedupe, cap at 400.
- New `systemPrompts.icon`: "given the box/brand text and a flat list of
  FontAwesome codename candidates, return exactly one codename that best
  represents the text; strict `{"icon": "..."}` JSON; variation changes → pick a
  different but equally fitting candidate."
- Per-route user content: for `icon`, include `icons` in
  `JSON.stringify({ prompt, schema, variation, icons })`.
- Per-route `toPayload('icon')`: returned `icon` must be a member of the sent
  codename list; reply `{ icon: 'fa-' + codename }`; else `null` (chain moves on).
- Update the route comment header.

### 2. `assets/js/logo.js` — expose three small hooks
- `export function getSelectedTarget()` → current `selectedTarget` (`<i>` el).
- `export function aiIconCatalog()` → array of codenames (strip `fa-`), filtered
  by `selectedCategory` when not `'all'` (smaller payload + focused pick).
- `export function selectIcon(iconName)` → set `selectedTarget.className =
  'fas ' + iconName`, highlight the matching `.logo-item`, `syncLogoActive()`.
  Reuse it inside the existing grid click handler (DRY, no duplication).

### 3. `assets/js/icon-tools.js` — new module (new capability = new module)
- `__VITE_AI_ENABLED__` guard like `color-tools.js` + `nextVariation()`.
- `contextText(target)`: feature card → `.f-header h4` / `[data-bind$="-heading"]`;
  else brand container (`.brand-container, .branding, .brand-pill, .ldg-head`) →
  `[data-bind="title"], h2, h1, .brand-title`. Returns `''` when no text → the
  tool shows "لا يوجد نص بجانب الأيقونة المحددة." and aborts.
- `run(regenerate)`: disable buttons + spinner + busy status → POST
  `/api/ai/icon` → on 200 `selectIcon(data.icon)` + ok status (with `usedModel`);
  map `limits_exceeded` / `not_configured` / network / invalid-color errors to
  Arabic status strings (same copy style as `color-tools.js`).
- `export function initIconTools()` wiring `#iconAiBtn` / `#iconAiRegenerate` /
  `#iconAiStatus`; called from `events.js` `bind()` after `renderLogos()`.

### 4. `assets/js/ui-config.js` — markup + shared CSS
- In `brandPaneHtml()`: insert the `icon-tool-box` above `#logoGrid`.
- Extend the existing selectors to share the color-tool styles (no duplication):
  `.color-tool-box, .icon-tool-box`, `.color-tool-title, .icon-tool-title`,
  `.color-ai-input, .icon-ai-input` (+focus), `.color-preview-row, .icon-preview-row`;
  plus a small `.icon-tool-hint` paragraph style.

### 5. `assets/js/events.js`
- Import `initIconTools` from `./icon-tools.js`; call after `renderLogos()`.

## Verification

1. `node --check` all changed files.
2. `npm run build` passes.
3. Headless CDP smoke (`/tmp/opencode/icon-ai-smoke.mjs` on port 9222) against
   the dev server (frontend hot-reloads; proxy route tested on a temp
   `vite preview --port 5199` instance):
   - Brand pane renders the icon tool box + generate/regenerate.
   - Clicking "اخت أيقونة" with a selected card/logo target applies an icon
     from the catalogue to the right `<i>`, highlights the grid tile, status ok.
   - Empty-context case shows the Arabic "لا يوجد نص…" error.
   - Manual grid click still works; `#esTitle` stays "إعدادات التصميم".
   - `curl` `/api/ai/icon` on the preview server returns `{ icon: "fa-…" }`.

## Notes / constraints

- **Server is user-managed:** the new `/api/ai/icon` route only goes live on the
  dev server after the user restarts it; the temp preview server and CDP Chrome
  instance are stopped after testing. No changes to templates (`templates/`).
- Style: kebab-case classes, camelCase, `El`/`Btn`/`handle` conventions, Arabic
  copy plain and action-exact.