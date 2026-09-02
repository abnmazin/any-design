---
name: code-style-guide
description: Applies to ALL code written in this project. Use whenever writing, editing, refactoring, or reviewing any code, component, hook, or file. Covers naming conventions, formatting, comments, JSDoc, git commits, and Arabic UI copy conventions. Any code produced must conform to this style guide.
---

# Code Writing Style Guide

## Advertisement Design Studio — Code Style & Conventions

This is a writing-style guide only: naming, formatting, comments, and code organization conventions. It governs how code is written — not architecture, tech-stack, or business-logic decisions (those live in `ARCHITECTURE.md` and `ENGINEERING_DECISIONS.md`).

Every file, component, hook, or edit produced for this project MUST follow these conventions.

## 1. Naming Conventions

### 1.1 Files & Folders
- **Components**: `PascalCase.tsx` — `EditorSurface.tsx`, `TemplateCard.tsx`
- **Hooks**: `camelCase.ts`, always prefixed with `use` — `useElementDrag.ts`, `useLayerManagement.ts`
- **Utilities**: `camelCase.ts` — `coordinateMath.ts`, `formatSwitching.ts`
- **Types**: `camelCase.types.ts` or grouped in a `types/` folder — `element.types.ts`
- **Folders**: `kebab-case` for feature/route folders — `features/editor`, `app/(auth)`
- One component per file; the file name matches the default export name exactly

### 1.2 Components
- `PascalCase` for component names and their file names
- Name by what the component *is*, not what it does internally — `LayerPanel`, not `LayerPanelContainerWrapper`
- Boolean props read like a question: `isLocked`, `hasError`, `canEdit` — never `locked`, `error`, `edit`
- Event handler props: `onAction` naming — `onDragStart`, `onLayerSelect`, `onExportComplete`
- Internal handler functions: `handleAction` naming — `handleDragStart`, `handleLayerSelect`

### 1.3 Hooks
- Always `use` + verb/noun describing what it returns or manages — `useCanvasHistory`, `useElementDrag`
- Return an object with named keys for multiple values, not a bare array, once there are more than 2 return values:
  ```ts
  // Prefer
  const { position, isDragging, handleDragStart } = useElementDrag(elementId);

  // Avoid once return values grow past 2
  const [position, isDragging, handleDragStart] = useElementDrag(elementId);
  ```

### 1.4 Variables & Functions
- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, and enums
- `SCREAMING_SNAKE_CASE` for true constants (values that never change at runtime) — `MAX_HISTORY_ENTRIES`, `DEFAULT_CANVAS_SIZE`
- No abbreviations that aren't immediately obvious — `element` not `el`, `index` not `idx`, except well-known loop counters (`i`, `j`) in short loops
- Boolean variables read as a question: `isValid`, `hasChanges`, `shouldSanitize`

### 1.5 Types & Interfaces
- `PascalCase`, no `I` or `T` prefix — `ElementProperties`, not `IElementProperties`
- Prop types named `<ComponentName>Props` — `LayerPanelProps`
- Discriminated unions for element variants, tagged with a `type` field matching the domain language — `type: 'text' | 'image' | 'shape' | 'mockup'`

## 2. Formatting

### 2.1 General
- 2-space indentation, no tabs
- Single quotes for strings, except JSX attributes (double quotes, per JSX convention)
- Always use semicolons
- Trailing commas in multiline arrays/objects/params
- Max line length ~100 characters as a soft guideline, not a hard rule — readability wins over strict wrapping

### 2.2 Import Order
Group and order imports with a blank line between groups:
1. External packages (`react`, `zustand`, `next/navigation`)
2. Internal absolute imports (`@/lib/...`, `@/components/...`)
3. Relative imports (`./`, `../`)
4. Type-only imports last within each group, using `import type`

```ts
import { useState, useCallback } from 'react';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

import { useElementDrag } from './hooks/useElementDrag';
import type { ElementProperties } from './types';
```

### 2.3 Component File Structure
Within a component file, order sections consistently:
1. Imports
2. Types/interfaces local to this file
3. Constants local to this file
4. The component function
5. Sub-components (only if trivial and used nowhere else — otherwise extract to their own file)

### 2.4 JSX Formatting
- One attribute per line once a tag has more than 2 attributes
- Conditional rendering with `&&` for simple show/hide, ternaries for either/or, never nested ternaries — extract to a variable or early return instead
- Extract inline styles/complex class logic into `cn()`/`cva()` calls, not long inline `className` template strings

## 3. Comments & Documentation

### 3.1 When to Comment
- Comment **why**, not **what** — the code already says what it does; comments explain the non-obvious reason
- No comment restating the line below it:
  ```ts
  // Bad
  // increment counter
  counter++;

  // Good — explains a non-obvious reason
  // Snapshot after commit, not on every pointer move, to keep history compact
  pushHistorySnapshot(currentState);
  ```
- Every custom hook gets a one-line comment above its declaration describing its responsibility, if the name alone doesn't make it obvious
- Mark unfinished or intentionally simplified logic with `// TODO:` and a short reason, never leave it unmarked

### 3.2 JSDoc for Shared/Exported Utilities
- Functions exported from `lib/` or shared `utils/` get a short JSDoc block: purpose, params, return value
- Components and hooks used only within one feature folder don't need JSDoc — the type signature and a one-line comment are enough

### 3.3 Tone
- Comments are plain and direct, in the same technical register as the code — no jokes, no filler, no restating the obvious
- Error messages shown to users (not code comments) follow the tone in `ENGINEERING_DECISIONS.md` — plain, calm, tells the user what happened and what to do next

## 4. Git Commit Style

Semantic commits: `<type>(<scope>): <short description>`

- **Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`
- **Scope**: the feature folder affected — `editor`, `auth`, `export`, `templates`, `dashboard`
- **Description**: imperative mood, lowercase, no trailing period

Examples:
```
feat(editor): implement drag and drop
fix(auth): resolve session timeout
refactor(editor): optimize layer render tree
docs(architecture): update database schema docs
test(export): add PDF generation tests
```

- Body (optional, below the subject line) explains *why* the change was made, not a restatement of the diff
- One logical change per commit — don't mix a refactor with a feature in the same commit

## 5. Language & Copy Style (In-App Text)

- Arabic UI copy is written in plain, direct language — no filler words, no over-formal phrasing
- Buttons/actions name exactly what happens: "احفظ التصميم" not "إرسال" for a save action
- Error messages state what happened and what to do, without apologizing or blaming the user
- Consistent terminology across the whole app: if an element is called "طبقة" (layer) in one place, it's never called "عنصر مرتب" somewhere else — one term per concept throughout

## Enforcement

When writing or reviewing any code, hooks, components, or files for this project, follow every rule above. If existing code in the file being edited already follows a slightly different but still consistent local pattern, match the surrounding file's style to avoid churn, but otherwise apply these conventions.

*This file governs writing style and code conventions only. See `ARCHITECTURE.md` for system structure and tech choices, and `ENGINEERING_DECISIONS.md` for the reasoning behind major structural decisions.*
