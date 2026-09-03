---
name: code-style-guide
description: Applies to ALL code written in this project. Use whenever writing, editing, refactoring, or reviewing any code or file. Covers Vanilla JS naming conventions, formatting, DOM manipulation, git commits, and Arabic UI copy conventions. Any code produced must conform to this style guide.
---

# Code Writing Style Guide

## Strict Template Generator — Vanilla JS Code Style & Conventions

This is a writing-style guide only: naming, formatting, comments, and code organization conventions. It governs how code is written for our Vanilla HTML/CSS/JS stack.

Every file or edit produced for this project MUST follow these conventions.

## 1. Naming Conventions

### 1.1 Files & Folders
- **HTML**: `kebab-case.html` — `story.html`, `index.html`
- **JavaScript**: `kebab-case.js` — `editor-panel.js`, `site-settings.js`
- **CSS**: `kebab-case.css` — `site.css`, `animations.css`

### 1.2 JavaScript Variables & Functions
- `camelCase` for standard variables and functions.
- `PascalCase` for ES6 Classes (if used).
- `SCREAMING_SNAKE_CASE` for true constants (values that never change at runtime) — `MAX_IMAGE_SIZE`, `DEFAULT_CANVAS_WIDTH`.
- **DOM Elements**: Suffix variables holding DOM elements with `El` or `Btn` to distinguish them from data values — `titleInputEl`, `exportBtn`, `canvasWrapper`.
- Boolean variables read as a question: `isValid`, `hasChanges`, `isSidebarOpen`.

### 1.3 Event Handlers
- Event listener callbacks should be prefixed with `handle` — `handleImageUpload`, `handleTitleChange`, `handleExport`.

### 1.4 CSS Classes & IDs
- `kebab-case` for classes and IDs — `.feature-card`, `#story-canvas`.
- Avoid deeply nested CSS selectors. Keep specificity flat.

## 2. Formatting

### 2.1 General
- 2-space indentation, no tabs.
- Single quotes for JavaScript strings (except where double quotes are required for HTML strings or JSON).
- Always use semicolons in JavaScript.
- Max line length ~100 characters as a soft guideline — readability wins over strict wrapping.

### 2.2 Vanilla JS DOM Manipulation
- Cache DOM queries if used multiple times (e.g., `const titleEl = document.getElementById('title');`).
- Use `data-attributes` for binding state or metadata to HTML elements (e.g., `data-tool="text"`, `data-bind="title"`).
- Prefer `textContent` over `innerHTML` unless injecting actual HTML structure, to prevent XSS.

## 3. Comments & Documentation

### 3.1 When to Comment
- Comment **why**, not **what** — the code already says what it does; comments explain the non-obvious reason.
- Mark unfinished or intentionally simplified logic with `// TODO:` and a short reason.

### 3.2 Tone
- Comments are plain and direct, in the same technical register as the code — no jokes, no filler, no restating the obvious.

## 4. Git Commit Style

Semantic commits: `<type>(<scope>): <short description>`

- **Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`
- **Scope**: the feature affected — `ui`, `export`, `bindings`, `css`
- **Description**: imperative mood, lowercase, no trailing period.

Examples:
- `feat(bindings): add real-time text input binding to canvas`
- `fix(export): resolve memory leak in object URL creation`
- `refactor(ui): transition sidebar to strict form inputs`

## 5. Language & Copy Style (In-App Text)

- Arabic UI copy is written in plain, direct language — no filler words, no over-formal phrasing.
- Buttons/actions name exactly what happens: "احفظ التصميم" not "إرسال" for a save action.
- Error messages state what happened and what to do, without apologizing or blaming the user.
- Consistent terminology across the whole app: if an element is called "حقل" (field) in one place, it's never called "مربع إدخال" somewhere else.

## Enforcement

When writing or reviewing any Vanilla JS, HTML, or CSS for this project, follow every rule above. If existing code in the file being edited already follows a slightly different but still consistent local pattern, match the surrounding file's style to avoid churn, but otherwise apply these conventions.