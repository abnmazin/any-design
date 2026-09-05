---
name: anydesire-pages
description: Use when building, matching, or extending the AnyDesire.Design app pages — the dark-purple glassmorphism login/auth screens and the templates gallery page under app/ ("login screen", "home page", "القوالب", "templates gallery", "new app page", "AnyDesire.Design"). Captures the shared design tokens, layout components (glass header, hero + mesh, stat chips, filter pills, template cards, CSS phone/laptop mockups), the novalidate form pattern, and the data-driven template grid with size-ring filtering. Apply together with the code-style-guide skill.
---

# AnyDesire.Design App Pages

Two canonical pages define the app's UI: `app/index.html` (login) and
`app/home.html` (templates gallery). New app pages under `app/` should be
built by extending these patterns, never by inventing new components or
tokens.

## Golden rules

- Never edit, delete, or rename template files under `templates/`. App pages
  only link to them via `../templates/<id>/<file>.html`.
- Both pages are RTL Arabic (`lang="ar" dir="rtl"`), standalone HTML with Font
  Awesome 6.5.1 + IBM Plex Sans Arabic from CDN, and no framework.
- All copy is Arabic, plain and direct, naming exactly what the action does.
- Follow the code-style-guide: camelCase JS, kebab-case classes/ids,
  single-quoted strings, 2-space indent, `El`/`Btn` suffixes on DOM vars.

## Design tokens (copy verbatim from `:root`)

Dark purple theme, `color-scheme: dark`. Key values:

- `--bg: #09080f`, `--bg-secondary: #100d1a`, `--bg-soft: #171225`
- `--text: #f4f1fa`, `--muted: #a8a1b8`
- `--border: #2a2438`, `--border-strong: #463a5c`
- `--accent: #a970ff`, `--accent-strong: #c18aff`
- `--accent-dim: #a970ff1f`, `--accent-border: #a970ff61`
- `--purple-deep: #6e3cbc`
- `--danger: #e07a8a`, `--danger-dim: #e07a8a1f`
- `--success: #73c69a`, `--success-dim: #73c69a1f`

Every new page must start from `color-scheme: dark` and these tokens. Use
`color-mix(in srgb, <token> <pct>%, transparent)` for tints instead of hard-
coding alpha hexes. Include the prefers-reduced-motion reset block.

## Layout components

### Split login layout (`app/index.html`)
- `.preview-panel` (flex 1.15): left showcase — `.mesh` (radial gradients),
  `.grain` (SVG feTurbulence overlay, opacity 0.035), `.preview-copy` with a
  `.kicker` pill, and a `.device-stage` of CSS `.laptop` + overlapping `.phone`
  mockups with `.device-badge` chips.
- `.form-panel` (flex 1): `.form-brand` (logo icon + `AnyDesire.Design`,
  `direction: ltr`), `.form-heading`, `.segmented` control, the form, `.divider`,
  `.icon-row`, `.signup-line`.
- Hide `.preview-panel` under `max-width: 940px`.

### Templates gallery (`app/home.html`)
- `.site-header`: sticky glass bar (`backdrop-filter: blur(20px)`,
  `color-mix(85%)` bg). Children: `.brand` (logo + name), `.main-nav`,
  `.header-search` (icon + input, hidden under 720px with `.main-nav`),
  `.header-actions` (`.icon-btn-sm` bell + `.avatar`).
- `.hero`: overlapping `.mesh`, `.hero-content` with h1 + lazy subtitle, and
  `.stat-chips` / `.stat-chip` (icon + `.num` + `.lbl`). The "قالب متاح" count
  is the real template count, set from JS, never a hard-coded marketing number.
- `.filter-bar` → `.pill-group` / `.pill` (+ `.active`). Pills are **functional**
  filters driven by `data-filter`, not decorative toggles.
- `.template-grid` (auto-fill `minmax(240px, 1fr)`) of `.tpl-card`.
- `.tpl-card`: `.tpl-preview` (176px, gradient bg, `.device-tag`, CSS mockup,
  hover-reveal `.tpl-overlay` with `a.overlay-btn.primary` + `.ghost`), then
  `.tpl-info` (`.tpl-name`, `.tpl-meta` with `.cat-tag` + size text).

### CSS device mockups
- `.mock-phone` (width 34%, aspect 9/18) and `.mock-laptop` (width 78%) are
  pure CSS: dark bezel, `.mock-bar` skeletons tinted per template, `9:16`/
  `16:9` in the `.device-tag`. Use portrait mock for landscape→laptop.

## Form pattern (login)

- `<form id="loginForm" novalidate>` — never rely on native validation bubbles.
- Floating-label fields: `.fl-field` with `input[placeholder=" "]` +
  `<label for="...">`; label floats via `:focus` /
  `:not(:placeholder-shown)`.
- `submit` listener: `e.preventDefault()`; per-field check; toggle
  `.has-error` on `.fl-field` (shows the `.error-msg` div); on valid submit
  `window.location.assign('./home.html')`. Each input's `input` event clears
  its field's `.has-error`.

```js
form.addEventListener('submit', function (e) {
  e.preventDefault();
  var valid = true;
  if (!loginId.value.trim()) { idField.classList.add('has-error'); valid = false; }
  else idField.classList.remove('has-error');
  if (!loginPassword.value.trim()) { passField.classList.add('has-error'); valid = false; }
  else passField.classList.remove('has-error');
  if (!valid) return;
  window.location.assign('./home.html');
});
loginId.addEventListener('input', function () { idField.classList.remove('has-error'); });
loginPassword.addEventListener('input', function () { passField.classList.remove('has-error'); });
```

- `.segmented` toggle switches `#loginId` input type/autocomplete (`text` +
  `username` vs `tel` + `tel`) and the `<label>` / `.error-msg` text together.

## Template grid pattern (home)

- A `TEMPLATES` array drives the grid: `{ id, name, size: '1080 × 1920',
  file: '../templates/<id>/<file>.html', tint: '#a970ff' }`. Render into
  `#templateGrid`; set the hero count chip to `TEMPLATES.length`.
- Size rings computed from the real aspect ratio, `data-size` per card:
  - `9:16` → `story` (ستوري)
  - `16:9` → `banner` (بانر)
  - `1:1` → `square` (مربع)
  - anything else → `other`; **shown only under "الكل"** — never in a size pill.
- Pills: `الكل` / `ستوري 9:16` / `بانر 16:9` (drop a pill if no template fits).
- Active pill toggles `is-hidden` on non-matching cards
  (`c.classList.toggle('is-hidden', f !== 'all' && c.dataset.size !== f)`).
- Whole-card click + both overlay anchors navigate to `data-href` / `href`
  (card click handler must ignore clicks originating inside `a`).
- Per-template `tint` colors the preview gradient, tag icon, and cat tag.

## Verification

After a change: `node --check` (if JS files involved), and a headless CDP smoke
against `http://127.0.0.1:5198` asserting render, filter behavior, and that
card/"استخدم" navigation reaches the real `../templates/...` files.