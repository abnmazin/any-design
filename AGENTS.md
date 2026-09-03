# AGENTS.md

Guidance for agents working in this repository. Read this first, then
`STRUCTURE.md` for the module layout and `CHANGELOG.md` for what changed and why.

## What this is

A browser-based advertisement design studio. Templates are static multi-page
HTML files under `templates/` (plus `public/mockups/`), each loading a shared
split-ESM editor entry point (`assets/js/editor.js`). There is no framework; the
editor is plain DOM + vanllla JS with FontAwesome for icons and
`html2canvas` for export.

## Commands

- Install: `npm install`
- Dev server: `npx vite --port 5198`
- Build: `npm run build` (Vite bundles `assets/js/editor.js` into
  `dist/assets/editor-*.js`; templates under `dist/` reference it)
- Syntax check any module: `node --check assets/js/<file>.js`
- Verify in a real browser: headless Chrome CDP on `http://127.0.0.1:9222`
  against the dev server (see `tests/`-style CDP harnesses under
  `/tmp/opencode/` for the patterns used to assert drawer/layer behaviour).

## Conventions

- English file/function/comment naming; Arabic only for in-app UI copy.
- Coding style is mandated by `.opencode/skills/code-style-guide/SKILL.md` —
  follow it for every edit.
- Before changing code, read `.opencode/skills/workflow-protocol/SKILL.md`:
  plan first (write the plan to a markdown file and get approval) before
  executing.
- Every editor capability lives as one ESM module under `assets/js/` (see
  `STRUCTURE.md`); add new features by adding a module, never by growing the
  templates.

## Key invariants (do not break)

- **Flattening:** on boot and after any canvas restore, the editor flattens the
  template DOM into independent, absolutely-positioned layers
  (`flattenCanvasIntoLayers`), assigns each a unique `z-index`
  (`initLayerStack`), and re-measures the scaled canvas (`updateCanvasScale`).
- **Grouping:** top-level template containers (see `GROUP_SELECTOR` in
  `interactions.js`) become one draggable/resizable group. A node inside an
  outer group is a CHILD even if it matches `GROUP_SELECTOR`; mockup frames are
  always independent top-level layers. Group children are reorderable in the
  layers drawer.
- **Locking:** non-text layers lock by default (on first visit only); locks
  gate move/resize but never selection. Reordering in the drawer bypasses lock.
- **History:** user edits record a canvas snapshot; Ctrl+Z/Ctrl+Shift+Z undo/redo
  restores it and re-flattens. New mutating actions must call `record()`
  (from `history.js`) BEFORE mutating the canvas.

## Testing reminders

- In the layers drawer, always read a row's own fields with `:scope > .lay-*`
  selectors — a group row contains a nested child `<li>`, and a plain
  `.querySelector('.lay-tag')` matches the child row's tag first.
- After changing any editor logic run `node --check` on all changed modules,
  `npm run build`, and a headless-browser smoke test of selection / move /
  resize / lock / reorder / undo-redo / element insertion.