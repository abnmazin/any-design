# Plan: Standalone glassmorphism login demo page

## Goal
A new standalone demo page (not wired to the app) replicating the pasted
tutorial's glassmorphism login form, using the project's FontAwesome icon set
and an animated gradient-blob background instead of ion-icons / static image.

## Design
- New root-level page `glass-login.html` (self-contained: inline `<style>` +
  `<script>`, loads FontAwesome + the Poppins font from CDN, like the other
  pages load FA).
- **Animated background:** dark base gradient + 3 soft colored blobs
  (project accents `#0061ff`, `#60efff`, `#a970ff`) drifting/floating via CSS
  keyframes behind the card.
- **Glass card:** `backdrop-filter: blur`, translucent white border, `border-
  radius`, centered.
- **Interactive inputs:** one `.inputbox` per field with a FontAwesome icon
  (`fa-envelope`, `fa-lock`), underline border that stays highlighted on
  focus, and a floating label that slides up on `:focus` / non-empty via
  `:user-valid` handling (label moves when input has content).
- **Extras:** "Remember me" checkbox + "Forget Password" link row; submit
  button with the tutorial's hover effect (white → 50% white); "Don't have an
  account? Register" row.
- English UI copy (tutorial replica), `dir="ltr"`.
- A tiny script for the floating label when the browser autofills; button shows
  a loading feedback then a success state (demo only).

## Files
- Add: `glass-login.html` (root).
- No changes to existing files (standalone demo; not wired to app).

## Verification
- `node --check` N/A (no JS module).
- Load in headless Chrome: verify the card renders, blobs animate (two frames
  differ), typing floats the label, icon glyphs render, hover state applies.
- `npm run build` unaffected (page is static; not part of the Rollup inputs).