# Plan: Make the pasted AnyDesire.Design screen the app login

## Goal
Replace `app/index.html` with the pasted AnyDesire.Design login screen, wired
into the app flow. Details (titles, texts, links) will be edited afterwards as
the user refines them.

## Changes
- Replace `app/index.html` with the pasted page **verbatim** (layout, CSS,
  Arabic copy, segmented email/phone toggle + its script), plus only the login
  wiring:
  - `required` on `#loginId` and `#loginPassword` (native validation, keeps the
    design untouched).
  - Submit handler: stays on empty fields; on filled fields
    `window.location.href = 'home.html'` (relative to `app/`).
- No other files touched.

## Verification
- `app/index.html` 200 on dev server; headless Chrome: form panel renders,
  segmented toggle switches label/type, focus floats labels, empty submit stays,
  filled submit navigates to `app/home.html`.