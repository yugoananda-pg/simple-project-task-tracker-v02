# Simple Project Task Tracker 2.0 — Development Process & Execution Log

**Document:** `dev_proc.md`  
**Product:** Simple Project Task Tracker 2.0  
**Language:** Australian English  
**Companion blueprint:** [`./doc/dev_plan.md`](./dev_plan.md)  
**Last updated:** 27 August 2026  

---

## 1. Document Overview & Intent

`dev_proc.md` is the ongoing engineering process and execution log for Version 2.0. It records:

- Step-by-step implementation activity for each development Wave
- The prompts (or prompt intent) used to drive AI-assisted delivery
- Engineering results and artefacts produced
- User Acceptance Testing (UAT) outcomes and post-UAT refinements

This log is updated as each Wave completes UAT. The North Star scope, data models, RBAC rules, and phased roadmap remain defined in **`./doc/dev_plan.md`**. Where process notes and the blueprint differ, the blueprint is authoritative for product intent; this log is authoritative for what was actually built and verified.

---

## 2. Wave 1 Preparation & Setup

| Item | Detail |
|------|--------|
| **Wave focus** | Advanced Task Model & Drag-and-Drop Kanban Board (client UI first) — F-201 & F-202 |
| **Workspace** | Migrated off OneDrive to `/Users/yugoananda/Cursor Project/Simple Project Task Tracker 2.0/` for reliable git and local tooling |
| **Scaffold** | Next.js App Router project (TypeScript, Tailwind CSS) initialised and linked to GitHub (`simple-project-task-tracker-v02`) |
| **UI / DnD dependencies** | `@hello-pangea/dnd` (Kanban drag-and-drop), `lucide-react` (icons) |
| **Persistence (Wave 1)** | Client-first LocalStorage store (`src/lib/store.ts`) with seed data; cloud backend deferred to Wave 2 |

---

## 3. Sub-Phase Execution Log (Prompts & Engineering Results)

### Step 1 — Domain Models

| | |
|--|--|
| **Feature IDs** | Foundation for F-201 / F-202 (and later waves) |
| **Prompt (summary)** | Update `src/lib/types.ts` to reflect Section 3 of `dev_plan.md`: export union types `GlobalRole`, `TaskStatus`, `TaskPriority`, `TaskBucket` and interfaces `User`, `Project`, `Subtask`, `TaskComment`, `Task` (including optional nested `subtasks` / `comments`). |
| **Result** | Created `src/lib/types.ts` with strict TypeScript exports aligned to the North Star schema. Date fields use `string \| null` (ISO / `YYYY-MM-DD`); roles and planner enums use string unions. Typecheck passed. |

### Step 2 — Kanban Board UI (F-201)

| | |
|--|--|
| **Feature ID** | F-201 |
| **Prompt (summary)** | Create client components under `src/components/kanban/`: `TaskCard.tsx` (`Draggable`), `KanbanColumn.tsx` (`Droppable`), `KanbanBoard.tsx` (`DragDropContext`) for To Do / Doing / Completed; Australian English labels; overdue cues; `onStatusChange` / `onTaskClick`; SSR-safe client gating for `@hello-pangea/dnd`. |
| **Result** | Delivered interactive three-column Kanban with priority/bucket badges, PIC placeholder, DD/MM/YYYY due dates, overdue tint/badge, empty drop targets, and `useSyncExternalStore`-based client readiness gating to avoid hydration mismatches. |

### Step 3 — MS Planner–Style Detail Drawer (F-202)

| | |
|--|--|
| **Feature ID** | F-202 |
| **Prompt (summary)** | Create `TaskDetailDrawer.tsx`: right slide-over with backdrop, Escape/backdrop close; editable title/description; bucket, priority, status; PIC placeholder; six-date grid (planned/updated/actual); checklist with progress (“X of Y items completed”); comments UI as Wave 3 placeholder. |
| **Result** | Delivered Planner-style drawer wired to parent callbacks (`onTaskChange`, `onToggleSubtask`, `onAddSubtask`, `onPostComment`). Dark-mode-friendly Tailwind styling and Australian English copy throughout. |

### Step 4 — Integration & View Switcher

| | |
|--|--|
| **Feature IDs** | F-201 & F-202 integration |
| **Prompt (summary)** | Integrate Kanban into the project detail experience with a List View \| Kanban View switcher; synchronise status and drawer mutations via local store; keep hydration-safe rendering. |
| **Result** | Delivered `ProjectDetailView.tsx`, `TaskListView.tsx`, Wave 1 `store.ts`, home project list, and `/projects/[id]` route. View fade transition, drawer open/close animation window, and LocalStorage persistence with seed project/tasks. Build and lint verified. |

---

## 4. Post-UAT Refinements & Bug Fixes

After initial Wave 1 UAT, the following refinements were applied before closing the Wave:

| Issue | Resolution |
|-------|------------|
| React `useSyncExternalStore` warning — “getServerSnapshot should be cached” | Introduced module-level `SERVER_SNAPSHOT` in `src/lib/store.ts`; `getServerStoreSnapshot()` returns the same referential constant on every call. |
| Delayed native tooltips on disabled buttons | Replaced HTML `title` with instant CSS/`group-hover` tooltips (`duration-0`). Copy: “Please enter a checklist item name first”, “Please enter comment text first” (and equivalent for Add task). |
| Date fields — focus loss / truncated year while typing | Switched date fields to uncontrolled `type="date"` inputs that sync parent state on `onBlur` only; captions remain DD/MM/YYYY (Australian English). |
| Drawer horizontal overflow | Enforced `overflow-x-hidden`, `min-w-0` / `max-w-full` on drawer content; checklist form uses `flex-col sm:flex-row` with `flex-1 min-w-0` input and `shrink-0` button. |
| Visual contrast & redundant heading | Slate header banner vs zinc page canvas; clearer project card surfaces; removed redundant secondary brand heading under the top bar on the home page. |
| Workspace reliability | Project relocated from OneDrive to a local `Cursor Project` path; healthy git remote retained against GitHub. |

---

## 5. Wave 1 User Acceptance Testing (UAT) Matrix

| Check | Scenario | Expected behaviour | Result |
|-------|----------|--------------------|--------|
| **1** | **View Switcher** | Toggle between List View and the 3-column Kanban View (To Do, Doing, Completed) | **PASS** |
| **2** | **Drag-and-Drop** | Dragging cards between columns updates `Task.status` and persists in the Wave 1 store | **PASS** |
| **3** | **Detail Drawer** | Clicking a task card opens the right-aligned slide-over drawer | **PASS** |
| **4** | **Planner Fields & Checklists** | Field updates apply live; checklist shows dynamic progress (“X of Y completed”); disabled primary buttons show instant hover tooltips | **PASS** |
| **5** | **Overdue Cues & Australian Dates** | Incomplete past-due tasks show red overdue cue; dates support native picker and smooth keyboard entry with DD/MM/YYYY captions | **PASS** |

**UAT conclusion:** All five Wave 1 verification scenarios passed after post-UAT refinements.

---

## 6. Wave 1 Completion Status

| Field | Status |
|-------|--------|
| **Wave 1 status** | **100% COMPLETED and verified** |
| **Scope delivered** | F-201 (Kanban), F-202 (Planner-style drawer + checklist UI), List/Kanban switcher, local persistence, AU English UX polish |
| **Deferred to later waves** | Supabase Auth / RBAC (Wave 2); Gantt, analytics dashboard, and cloud-synced comments (Wave 3) |
| **Readiness** | Ready to commence **Wave 2: Cloud Backend, Supabase Auth & Multi-User Integration (RBAC Setup)** per `dev_plan.md` Section 7 |

---

## Appendix — Key artefacts (Wave 1)

| Path | Role |
|------|------|
| `doc/dev_plan.md` | North Star blueprint |
| `doc/dev_proc.md` | This execution log |
| `src/lib/types.ts` | Domain types |
| `src/lib/store.ts` | Wave 1 LocalStorage store + `SERVER_SNAPSHOT` |
| `src/components/kanban/*` | Kanban board + task detail drawer |
| `src/components/tasks/TaskListView.tsx` | Traditional list view |
| `src/components/projects/ProjectDetailView.tsx` | Project hub + view switcher |
| `app/page.tsx` / `app/projects/[id]/page.tsx` | Routes |

---

*End of Wave 1 log. Subsequent Waves will append new sections below this point without rewriting completed Wave history.*
