# AI_BASELINE.md — RebornShadowProject01

## Purpose
Offline-capable Jira-style task tracker (Kanban + List View) with enforced flow rules, clear UX, and simple maintenance.

---

## Change Control
AI_BASELINE is a roadmap and rulebook. It does **NOT** authorize automatic implementation.

### No-code-change rule
The AI must **NOT** modify code or propose patch files unless:
1) We discuss the change in chat first, **AND**
2) I explicitly approve with one of these phrases:
   - "Proceed with code changes"
   - "Make the patch"
   - "Generate updated files"
   - "Implement this now"

If I have not explicitly approved, the AI may only:
- analyze current behavior
- explain likely causes
- propose options with pros/cons
- provide a plan or checklist
- ask targeted questions (if needed)

### Output gating rule
Even after we discuss a change, the AI must **NOT** generate or output updated code files/patches unless I explicitly say:
- "Generate updated files"
(or one of the approval phrases above)

Until then, the AI may only provide analysis, options, and a proposed implementation plan.

### Safety rule: don’t break working features
When proposing a change, the AI must identify:
- what files will be touched
- expected behavior change (if any)
- risk of regression
- rollback plan

### Patch workflow (preferred)
When approved:
- AI produces a patch limited to the agreed files
- AI lists EXACTLY what changed (bullet list)
- AI states how to test the change (quick steps)

---

## Canonical branch + what “latest” means
- **Canonical branch:** `main`
- **Latest baseline:** HEAD of `main` unless you explicitly tell me to use a tag or commit SHA.
- **Stable checkpoints:** use Git tags (ex: `v0.2.0`) when something is known-good.

---

## Repo structure
- `index.html` (entrypoint)
- `js/` (all JavaScript)
- `css/` (all CSS)

Run offline by opening `index.html` in a browser.

---

## Raw Link Index (preferred for AI syncing)
GitHub’s normal UI pages can fail to load in some environments. The raw links below are the authoritative way for the AI to fetch the latest files.

### Base raw URL (main)
`https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/`

### Entry
- `index.html`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/index.html

### JavaScript (js/)
- `js/main.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/main.js
- `js/data.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/data.js
- `js/flowRules.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/flowRules.js
- `js/drag-drop.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/drag-drop.js
- `js/modals.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/modals.js
- `js/kanban-render.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/kanban-render.js
- `js/list-render.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/list-render.js
- `js/attachments.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/attachments.js
- `js/priority.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/priority.js
- `js/utils.js`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/js/utils.js

### CSS (css/)
- `css/styles.css`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/css/styles.css
- `css/global.css`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/css/global.css
- `css/kanban.css`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/css/kanban.css
- `css/list-view.css`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/css/list-view.css
- `css/modal-and-metadata.css`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/css/modal-and-metadata.css
- `css/forms-and-dropzone.css`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/css/forms-and-dropzone.css
- `css/attachments-and-editor.css`  
  https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/main/css/attachments-and-editor.css

---

## Pinning a specific commit (zero ambiguity)
If you want the AI to work off an exact commit, send the commit SHA and the AI will use raw links like:

https://raw.githubusercontent.com/dsd1990/RebornShadowProject01/<COMMIT_SHA>/js/flowRules.js

Same structure, but replace `main` with the SHA.

---

## Non-negotiable engineering rules
1) **Single source of truth for status changes**
   - All moves (drag/drop, modal dropdown, any future bulk actions) MUST call:
     - `applyStatusChange(task, newStatus)`
   - No direct `task.status = ...` in UI paths.

2) **Flow rules enforcement**
   - Allowed transitions are defined in `js/flowRules.js`.
   - UI must reflect these rules:
     - highlight allowed drop targets
     - block invalid transitions

3) **No duplicate global helpers**
   - If a helper exists in `js/priority.js`, it must not be redefined elsewhere.
   - Avoid same function names in multiple files.

4) **DTG standard**
   - DTG format: **DDHHMMZMMMYY**
   - Example: `101330Z DEC 25`
   - Validation + UI labels must match.

5) **History integrity**
   - `task.history` is always an array.
   - Rendering must be defensive (never crash if missing).

---

## File ownership map
- `js/main.js` — boot + view toggle + init wiring
- `js/kanban-render.js` — board rendering + columns
- `js/list-render.js` — list view rendering + sorting/filtering
- `js/drag-drop.js` — drag/drop UX (MUST call `applyStatusChange`)
- `js/modals.js` — create/edit modal (MUST call `applyStatusChange`)
- `js/flowRules.js` — transition rules + lifecycle helpers
- `js/priority.js` — priority calc + priority UI helpers
- `js/utils.js` — validation/parsing helpers (DTG, safe formatting, etc.)
- `css/*.css` — UI styling

---

## Shared Terminology (Board Vocabulary)
These terms are used as the canonical language for requests. When I ask for changes, I will reference these names.

### App-level
- **App Shell**: Entire page (header + view container + modals)
- **Top Bar / Header Bar**: The top row containing primary controls
- **Primary Action Button**: “+ Create Task”
- **View Toggle**: Kanban View ↔ List View control
- **View Container**: The area where the active view renders

### Views
- **Kanban View**: Column-based board view
- **List View**: Table/list-based view

### Kanban structure
- **Board**: The full kanban grid
- **Column (Status Column)**: One vertical section representing a single **Status**
- **Column Header**: The title area of a column
- **Column Body / Dropzone**: The area where cards live + drop targets

### Cards
- **Task Card / Card**: A draggable item representing one task
- **Card Face**: The default/collapsed content visible on the board
- **Card Face Fields**: Fields shown on the card face (currently: Unit–Operation, DTG, Operation Time Period)
- **Card Badge**: Small pill/label on a card (priority, tags, etc.)

### Task details (expanded)
- **Task Detail Modal / Task Modal**: Popup with full task details
- **Expanded View**: Content inside the modal
- **Task ID**: Unique identifier (hidden on card face; visible in modal)

### Flow / Routing
- **Status**: The current state of a task; maps 1:1 to a column
- **Transition / Move**: Change from one status to another
- **Allowed Transition**: Move permitted by flow rules
- **Blocked Transition**: Move rejected by flow rules
- **Flow Rules / Workflow Rules**: Logic that defines allowed transitions
- **Routing Path**: A sequence of statuses a task follows
- **Front Route**: Main operational flow path (QMOW → ANAV/SWO → REO → …)
- **Back Route**: Secondary path (if used)
- **Transmit Section**: Final release/transmit path (if used)
- **Lifecycle Status**: Approved/Active/Complete-type statuses (if used)
- **Group**: High-level category (Front Route / Back Route / Transmit / Lifecycle)

### Drag/drop UX
- **Pickup**: Drag start
- **Drop Target**: A column body that can accept drops
- **Allowed Drop Highlighting**: Visual cue showing valid drop targets
- **Disallowed Drop Dimming**: Visual cue showing invalid targets
- **Drag-Over State**: Hover styling when over a target

### Creation & editing
- **Create Task Modal**: Modal opened by “+ Create Task”
- **Create Form**: Fields inside create modal
- **Edit Fields**: Edits made within the Task Detail Modal

### Attachments / Notes
- **Attachments Panel**: Area listing attachments
- **Attachment Item**: One attachment entry
- **TXT Editor / Notes Editor**: Text area for notes (if used)


## How to request work from the AI
Include:
- **Goal**
- **Constraints** (offline-only, no libs, etc.)
- **Acceptance criteria**
- **Files allowed to change** (optional but helpful)

---

## Versioning expectations
- Tag stable checkpoints: `vX.Y.Z`
- Commit message prefixes:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
- If flow behavior changes, say so in the commit message.

---

## Planned next gaps (roadmap)
- Persistence (localStorage vs export/import JSON bundle)
- Attachment persistence (metadata-only vs embedded TXT vs base64 bundle)
- Replace blocking alerts with non-blocking toast UI
