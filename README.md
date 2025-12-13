# JiraClone-TaskBar — CURRENT Version Log

## CURRENT BUILD
- **Version:** v0.2.0
- **Date:** 2025-12-13 (JST)
- **Status:** Flow enforcement + UI guidance stabilization pass

## What changed in this build
### ✅ Flow enforcement (single source of truth)
- All status changes now route through `applyStatusChange()` (no more direct `task.status = ...` writes in UI paths).
- Drag/drop blocks invalid transitions (enforced by `isTransitionAllowed()`).
- Modal status dropdown blocks invalid transitions and retains valid state.

### ✅ Visual guidance
- On drag start, allowed destination columns highlight as valid drop targets.
- Disallowed columns are visually dimmed and will not accept a drop.
- Lifecycle columns are rendered so tasks moved to lifecycle states remain visible.

### ✅ Bug fixes / correctness
- Fixed task history rendering so history reliably displays (defensive handling of missing/invalid `task.history`).
- DTG format messaging standardized to **DDHHMMZMMMYY** (example: `101330Z DEC 25`).
- Removed duplicate priority logic from flow rules to prevent global overwrite; priority logic lives in `priority.js`.

## Files that define CURRENT
These are the only files you should treat as authoritative “live” code.

### HTML
- `CURRENT_index.html`

### JavaScript
- `CURRENT_flowRules.js`
- `CURRENT_drag-drop.js`
- `CURRENT_modals.js`
- `CURRENT_utils.js`
- `CURRENT_priority.js`

### CSS
- `CURRENT_kanban.css`

## Known limitations (intentional for now)
- Attachments are still metadata/UI-focused (filename list + basic type inference). No persistence/export format defined yet.
- No true persistence for tasks yet (refresh resets state unless you implement storage/export/import).

## Release archive recommendation
When you cut the next build, create a snapshot zip and upload it with:
- `RELEASE__v0.2.0__2025-12-13__Flow-Enforcement.zip`

## Next targets (planned)
1) Decide persistence model (localStorage vs export/import JSON bundle).
2) Attachment persistence approach (TXT embed vs metadata only vs base64 bundle).
3) Replace `alert()` with non-blocking toast UI for blocked moves.
4) List View: add filters by Group/Status and add lifecycle visibility.

---

## Versioning procedure (no folders required)
1) Before uploading a new build:
   - Rename existing `CURRENT_*` files into versioned backups:
     - `index_v0.2.0.html`, `flowRules_v0.2.0.js`, etc.
2) Upload new files using `CURRENT_*` prefix.
3) Update this log:
   - Version / Date / Changes / CURRENT file list
