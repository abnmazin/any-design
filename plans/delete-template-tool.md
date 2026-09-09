# Plan: Delete templates from home screen

**Scope:** `app/home.html` + `supabase/schema.sql` + one dev-side helper script.

## Constraint (why two parts are needed)

A button running in the browser **cannot remove files from this repo** — the site
has no backend with filesystem access (templates are static HTML folders, Supabase
is DB-only). File deletion can only be done by the agent on this machine. So the
feature is split:

1. **In-browser delete (works immediately):** a real "حذف" button per template
   card that permanently removes the template from the gallery for every user.
2. **Repo file removal (agent-run):** a helper script I execute on request that
   `git rm`s the template folder, prunes the gallery list, rebuilds `dist/`, and
   commits.

## Part A — In-browser delete

### `supabase/schema.sql` (append)
- New table `deleted_templates(id text PK, created_at, created_by)`. RLS:
  - `select` allowed for any authenticated user (home renders filtered gallery),
  - `insert` allowed for any authenticated user (the delete action),
  - **no** update/delete policy — a tombstone can only be undone in the SQL editor.
- Tombstone rows persist; the account that clicked can't silently undelete.

### `app/home.html`
- Add a danger **"حذف"** button (`tpl-delete`) to each template card's overlay
  (`overlay-btn danger` style) — home is already auth-gated, so the button only
  ever shows to signed-in users.
- Card click is currently hijacked for navigation; make sure the delete button
  stops propagation so it never triggers navigation.
- On delete click:
  - `confirm('حذف قالب ««name»» نهائيًا؟ لا يمكن التراجع.')` (destructive copy;
    honestly states what happens and that it can't be undone).
  - Call `Supabase.from('deleted_templates').insert({ id })`; on success remove
    the card from the DOM and decrement `#tplCount`.
  - If Supabase is unavailable, show a subtle alert and do nothing.
- On page load (inside the existing `DOMContentLoaded`/`loadDesigns` block):
  - Fetch `deleted_templates` ids (`select('id')`, time-boxed like other calls).
  - Render only templates whose id is not tombstoned; set `#tplCount` to the
    visible count. If the fetch fails, fall back to showing all (current behavior).

## Part B — Repo file removal (`scripts/remove-template.mjs`, new)

- `python-style` small Vanilla Node script, no deps:
  - `scripts/remove-template.mjs <templateId>` (currently supported ids:
    `wedding`, `story`, `bento`, `debt-ledger`, `windows-1`, `windows-2`,
    `phone-1`, `phone-2`).
  - Validates the id against the known list; refuses unknown ids.
  - `git rm -r templates/<id>/` (permanent, files gone from history-onward).
  - Removes the entry from the `TEMPLATES` array in `app/home.html`.
  - Runs `npm run build` so `dist/` no longer ships the template.
  - Stages + commits (`fix(ui): remove template <id>`).
- I run this for every template the user deletes via the button; the tombstone
  already hides it instantly, the script makes file removal permanent.

## Out of scope

- Per-user galleries, restore/undo, soft-delete in UI.
- Any dev server / headless-browser launches — per `AGENTS.md` Environment
  discipline, verification is `node --check` + `npm run build` only, unless the
  user orders a browser smoke.

## Verification
- `node --check` the changed/added JS.
- `npm run build` succeeds.
- Manual: user clicks delete on the home screen (needs schema applied).