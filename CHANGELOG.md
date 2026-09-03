# Changelog

All notable changes are recorded here. Follows
[Keep a Changelog](https://keepachangelog.com/) with semantic commits
(`feat` / `fix` / `refactor` / `docs` / `style` / `test`).

## [Unreleased]

### Added
- **Elements tool** (`elements.js`): a "العناصر" sidebar tab with a static
  catalog of ~50 reusable elements (shapes, arrows, icons, badges, lines,
  actions, social) across 8 category tabs plus a filterable search box.
  Clicking a tile inserts an independent, absolutely-positioned, selectable
  layer centred on the canvas. Elements are static labels; no `contenteditable`.
- **Undo / Redo** (`history.js`): canvas-snapshot history with Ctrl+Z and
  Ctrl+Shift+Z shortcuts and rail buttons. `record()` must be called BEFORE any
  mutating action (text edits, element insert, mockup insert); undo/redo
  restores the last snapshot and re-flattens the canvas via the
  `editor:canvas-restored` event.
- **Text editing polish** (`text.js` `initEditableText`): centralises
  `spellcheck=false` and `draggable=false` on every `contenteditable` leaf so
  Arabic text has no red squiggles and native text-dragging does not fight the
  move handles. Runs at boot and after any history restore.
- Editing history is snapshotted for text color/font/bold/resize and mockup
  uploads (`record()` calls added in `text.js` / `mockups.js`).

### Changed
- **Editable text on leaf nodes only**: `contenteditable` was moved to leaf
  text nodes across templates (`story`, `phone-1`, `phone-2`, `windows-1`), so
  icon `<i>` elements and structure are never editable.
- **Selection and hover UX**: selecting text shows the text toolbar only
  (no overlay box); the rotating layer ring appears only on `[data-layer]`
  hover and animates via `ui-config.js` (`layerRingRotate` 5s linear infinite).
- **Editor stage fills the viewport**: `site.css` makes the canvas stage
  `height: calc(100vh - 60px)` with hidden overflow so layers centre in the
  available space instead of overflowing the page.

### Fixed
- **`createObjectURL` leak**: `mockups.js` `wireMockupUpload` now revokes the
  previous blob URL before assigning a new one and resets `input.value` so
  re-selecting the same file re-fires `change`.
- **Upload overlay invisible on touch**: `editor.js` `injectUploadOverlayCss`
  gives `.upload-overlay` a faint resting opacity (`0.35`) instead of hiding it
  until `:hover`, which never fires on touch devices.

### Security
- No secrets or keys are stored anywhere in the repository or committed.

## [Previous] — Not yet released

Editor is a browser-based advertisement-design studio: static multi-page
templates each loading `assets/js/editor.js` (Vite split-ESM modules). The
editor flattens each template into independent draggable/resizable/groupable
layers with a layers drawer, per-layer locking, text editing toolbar, logo and
mockup insertion. The editor UI is a Canva-style chrome: a top navbar (save /
file title / navigation), a vertical tool rail (tools, undo-redo, zoom), a
right-side drawer split into tabbed panes (الطبقات / النص / القوالب / اللوغو /
العناصر), and a floating text toolbar over the selection. Drag/drop, move and
resize are standardised (top-left move handle, directional resize handles, a
rotating hover ring, `blob:` URL cleanup on upload). See `STRUCTURE.md` for the
module layout and `AGENTS.md` for engineering invariants.