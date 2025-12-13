# AI_BASELINE.md — RebornShadowProject01 (JiraClone-TaskBar)

## Purpose
Single-page, offline-capable Jira-style task tracker (Kanban + List View) with enforced flow rules.

## Canonical branch + “latest” definition
- **Canonical branch:** `main`
- **Latest baseline:** always the HEAD of `main` unless I explicitly reference a tag/commit.
- **Release points:** use Git tags (ex: `v0.2.0`) to mark stable checkpoints.

## Repo structure (source of truth paths)
- `index.html` (app entrypoint)
- `css/` (all stylesheets)
- `js/` (all JavaScript modules)

## How to run (offline)
- Open `index.html` directly in a browser.
- No build step, no dependencies, no network required.

## Non-negotiable engineering rules (to prevent regressions)
1) **Single source of truth for status changes**
   - Any status move (drag/drop, dropdown, future bulk actions) MUST call:
     - `applyStatusChange(task, newStatus)`
   - No direct `task.status = ...` in UI code paths.

2) **Flow rules enforcement**
   - All allowed transitions are defined in `js/flowRules.js`.
   - UI must reflect these rules (highlight allowed drop targets; block invalid transitions).

3) **No duplicated global helpers**
   - If a helper exists in `js/priority.js`, it should not be redefined elsewhere.
   - Avoid “same function name in multiple files.”

4) **DTG standard**
   - DTG format is: **DDHHMMZMMMYY**
   - Example: `101330Z DEC 25`
   - Validation + UI labels must match this exact standard.

5) **History integrity**
   - All tasks must maintain `task.history` as an array of events.
   - Rendering must be defensive (never crash if history is missing).

## File ownership map (what lives where)
- `js/main.js` — boot + view toggle + global initialization
- `js/kanban-render.js` — board rendering + column structure
- `js/list-render.js` — list view rendering + sorting/filtering
- `js/drag-drop.js` — drag/drop UX (MUST call `applyStatusChange`)
- `js/modals.js` — create/edit modals (MUST call `applyStatusChange`)
- `js/flowRules.js` — transition rules + lifecycle + enforcement helpers
- `js/priority.js` — priority calculation + priority UI helpers
- `js/utils.js` — validation/parsing helpers (DTG, safe formatting, etc.)
- `css/*.css` — UI styling (Kanban, list, modal, global)

## How to ask the AI for changes (request format)
When requesting work, include:
- **Goal:** what you want
- **Constraints:** flow rules, offline-only, no libraries, etc.
- **Acceptance criteria:** what “done” means
- **Files touched allowed:** (optional) list specific files to change

Example:
- Goal: Add persistence via localStorage
- Constraints: offline-only, no backend
- Acceptance: refresh restores tasks + history + attachments metadata
- Allowed files: js/data.js, js/main.js, js/utils.js

## Versioning + commits (simple + consistent)
- Use tags for stable checkpoints: `vX.Y.Z`
- Commit message pattern:
  - `feat: <summary>`
  - `fix: <summary>`
  - `refactor: <summary>`
- If a change modifies flow behavior, mention it explicitly:
  - `feat: enforce allowed transitions in drag/drop`

## Current known gaps (planned)
- Persistence (localStorage or export/import JSON)
- Attachment persistence approach (metadata-only vs embedded TXT vs base64 bundle)
- Replace blocking alerts with non-blocking toast UI
