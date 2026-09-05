# Plan: Replace app/index.html with the دفتر الديون glassmorphism login

## Goal
Make the pasted Arabic glassmorphism login the real app login page, keeping the
existing login flow (redirect to `app/home.html`).

## Changes
- Replace `app/index.html` with the pasted page, verbatim in style/content,
  with these wiring adjustments:
  - Keep all pasted CSS + markup (glow blobs, grid overlay, glass card,
    "دفتر الديون" brand, fields `#loginEmail`/`#loginPassword`, remember +
    forgot, تسجيل الدخول button, google/o س divider, signup line).
  - Title stays `تسجيل الدخول — دفتر الديون`.
  - Add `required` to both inputs (native validation keeps the design
    untouched).
  - Replace `onsubmit="return false;"` with a submit handler: blocked on empty
    fields, otherwise `window.location.href = 'home.html'` (relative to `app/`).
- No changes to any other file.

## Verification
- Load `http://127.0.0.1:5198/app/index.html` headless Chrome:
  card + glow + grid render, Cairo + FontAwesome loaded, focus ring applies,
  empty submit stays (no redirect), filled submit navigates to `app/home.html`.