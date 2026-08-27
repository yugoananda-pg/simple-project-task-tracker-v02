# Simple Project Task Tracker 2.0 — Development Process & Execution Log

**Document:** `dev_proc.md`  
**Product:** Simple Project Task Tracker 2.0  
**Language:** Australian English  
**Companion blueprint:** [`./doc/dev_plan.md`](./dev_plan.md)  
**Repository:** `https://github.com/yugoananda-pg/simple-project-task-tracker-v02.git`  
**Last updated:** 28 August 2026  

---

## 1. Executive Summary & Process Intent

This document is the **living engineering journal** and **step-by-step replication manual** for Simple Project Task Tracker 2.0. It records everything required to recreate the product state achieved at the end of each Wave — not only *what* was built, but *how* it was built.

`dev_proc.md` captures:

- Environment preparation and Terminal commands (including steps run manually on macOS before or outside AI sessions)
- AI prompts (or prompt intent) used to drive implementation
- Files created or modified, and the architectural outcome of each step
- User Acceptance Testing (UAT) scenarios, results, feedback, and post-UAT refinements
- A concise replication recipe so any human engineer or future AI collaborator can rebuild the same product state

**Scope of this edition:** Wave 1 is **100% complete and UAT-verified**. Wave 2 (Supabase Auth, PostgreSQL/Prisma, RBAC) and Wave 3 (Gantt, analytics, cloud-synced comments) remain defined in `dev_plan.md` and will be appended here as each Wave closes.

**Living document rule:** After every Wave completes UAT, append a new section (or sub-section) to this file. Do not rewrite completed Wave history unless correcting factual errors.

| Document | Role |
|----------|------|
| `doc/dev_plan.md` | North Star blueprint — scope, data models, RBAC, phased roadmap |
| `doc/dev_proc.md` | Execution log — what was actually built, tested, and verified |

---

## 2. Environment Preparation & Terminal Setup (macOS)

The following operations were executed on macOS. Some occurred **outside AI awareness** (manual Terminal work). They are recorded here so the full setup can be reproduced.

### 2.1 Navigation and project folder

```bash
cd "/Users/yugoananda/Library/CloudStorage/OneDrive-Personal/Documents/01. Yugo's/Cursor Project"
mkdir "Simple Project Task Tracker 2.0"
cd "Simple Project Task Tracker 2.0"
```

> **Note:** The workspace was later migrated off OneDrive to  
> `/Users/yugoananda/Cursor Project/Simple Project Task Tracker 2.0/`  
> because OneDrive caused git sync timeouts and unreliable `.git` operations.  
> The replication recipe in Section 6 uses the local path.

### 2.2 Next.js scaffolding (NPM directory naming workaround)

`create-next-app` can reject folder names with spaces. The workaround used a temporary folder name, then copied files into the target directory:

```bash
npx create-next-app@latest temp-v2
ditto temp-v2/ .
rm -rf temp-v2
```

**Stack chosen:** Next.js 16 (App Router), TypeScript, Tailwind CSS, ESLint.

### 2.3 Git initialisation and GitHub remote

```bash
git init
git add .
git commit -m "docs & feat: initial setup v2.0 with Next.js scaffolding and dev_plan.md"
git branch -M main
git remote add origin https://github.com/yugoananda-pg/simple-project-task-tracker-v02.git
git push -u origin main
```

### 2.4 Local domain setup (F-206 — Wave 1 prep)

```bash
sudo sh -c 'echo "127.0.0.1 tracker.local" >> /etc/hosts'
```

This prepares the machine for future local development under `http://tracker.local`. Full Next.js hostname binding is deferred to Wave 2 integration notes in `dev_plan.md`.

### 2.5 UI and drag-and-drop dependencies

```bash
npm install @hello-pangea/dnd lucide-react
```

**Security note:** npm may emit a benign `install-scripts` warning (e.g. for `unrs-resolver` postinstall). This was reviewed and accepted for Wave 1; no suspicious scripts were approved beyond standard package installs.

### 2.6 Verify the dev server

```bash
npm run dev
# Open http://localhost:3000
```

---

## 3. Blueprint Setup (The North Star)

Before feature code, the architectural blueprint was generated and saved as **`./doc/dev_plan.md`**.

### 3.1 Purpose

`dev_plan.md` is the fixed North Star for Version 2.0. It defines scope, data models, API intent, RBAC, edge cases, and the three-Wave roadmap.

### 3.2 Seven core sections (summary)

| Section | Contents |
|---------|----------|
| **1. Project Overview** | Transition from v1 LocalStorage MVP to multi-user enterprise tracker |
| **2. Feature List** | F-201 Kanban · F-202 Planner details · F-203 RBAC · F-204 Gantt · F-205 Analytics · F-206 `tracker.local` |
| **3. Data Models** | `User`, `Project`, `Task`, `Subtask`, `TaskComment`; enums for role, status, priority, bucket |
| **4. API Surface** | Auth, project/task CRUD, checklist/comment mutations, analytics aggregates |
| **5. Auth & RBAC** | Super PM / PM / Member / Viewer privilege matrix |
| **6. Edge Cases** | Out-of-scope items, error states, integrity rules |
| **7. Phased Roadmap** | Wave 1 UI · Wave 2 cloud/RBAC · Wave 3 Gantt/analytics/comments |

### 3.3 AI prompt (summary)

> *"Please create `./doc/dev_plan.md` as the North Star blueprint for Version 2.0, structured in seven sections, in Australian English, inheriting and expanding v1 capabilities."*

**Outcome:** `doc/dev_plan.md` committed as the canonical scope document for all subsequent Waves.

---

## 4. Wave 1 Implementation Journal (Step-by-Step Execution)

Wave 1 delivers **F-201** (Kanban) and **F-202** (Planner-style task details) with client-first LocalStorage persistence. Cloud auth and RBAC are intentionally deferred to Wave 2.

---

### Step 1 — Data Model Expansion

| | |
|--|--|
| **Feature** | Foundation for F-201 / F-202 (and later waves) |
| **Prompt (summary)** | Update `src/lib/types.ts` per Section 3 of `dev_plan.md`. Export union types `GlobalRole`, `TaskStatus`, `TaskPriority`, `TaskBucket` and interfaces `User`, `Project`, `Subtask`, `TaskComment`, `Task` (with optional nested `subtasks` / `comments`). |
| **Files** | `src/lib/types.ts` *(created)* |
| **Outcome** | Strict TypeScript domain layer aligned to the North Star schema. Date fields as `string \| null`; planner enums as string unions. Typecheck passed. |

---

### Step 2 — Drag-and-Drop Kanban Board UI (F-201)

| | |
|--|--|
| **Feature ID** | F-201 |
| **Prompt (summary)** | Create client components under `src/components/kanban/`: `TaskCard.tsx` (`Draggable`), `KanbanColumn.tsx` (`Droppable`), `KanbanBoard.tsx` (`DragDropContext`) for To Do / Doing / Completed columns. Australian English labels; overdue cues; DD/MM/YYYY date layout; `onStatusChange` / `onTaskClick`; SSR-safe client gating for `@hello-pangea/dnd`. |
| **Files** | `src/components/kanban/TaskCard.tsx`, `KanbanColumn.tsx`, `KanbanBoard.tsx` *(created)* |
| **Dependencies** | `@hello-pangea/dnd`, `@/src/lib/types` |
| **Outcome** | Interactive three-column Kanban with priority/bucket badges, PIC placeholder, overdue styling, empty drop targets, and `useSyncExternalStore` client readiness gate to prevent hydration mismatches. |

---

### Step 3 — MS Planner–Style Task Details Drawer (F-202)

| | |
|--|--|
| **Feature ID** | F-202 |
| **Prompt (summary)** | Create `TaskDetailDrawer.tsx`: right slide-over with backdrop; Escape/backdrop close; editable title/description; bucket, priority, status; PIC placeholder; six-date grid (planned/updated/actual); checklist with progress bar; comments UI as Wave 3 placeholder. |
| **Files** | `src/components/kanban/TaskDetailDrawer.tsx` *(created)* |
| **Dependencies** | `lucide-react` (close icon), `@/src/lib/types` |
| **Outcome** | Planner-style drawer wired to parent callbacks: `onTaskChange`, `onToggleSubtask`, `onAddSubtask`, `onPostComment`. Dark-mode-friendly Tailwind styling; Australian English copy throughout. |

---

### Step 4 — Integration & View Switcher

| | |
|--|--|
| **Feature IDs** | F-201 & F-202 integration |
| **Prompt (summary)** | Wire project detail view with List View \| Kanban View toggle; synchronise status and drawer mutations via local store; keep hydration-safe rendering; add routes and home project list. |
| **Files created/modified** | `src/lib/store.ts`, `src/components/projects/ProjectDetailView.tsx`, `src/components/tasks/TaskListView.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/projects/[id]/page.tsx`, `app/globals.css` |
| **Outcome** | End-to-end Wave 1 product: home project list → project hub with view switcher → Kanban or list → task detail drawer. LocalStorage seed data; view fade transition; drawer slide animation. `npm run build` and lint verified. |

#### Supporting store design (`src/lib/store.ts`)

| Mechanism | Purpose |
|-----------|---------|
| `STORAGE_KEY = "sptt_v2_wave1"` | Versioned LocalStorage blob |
| `SERVER_SNAPSHOT` | Stable empty store for SSR (`useSyncExternalStore`) |
| `subscribeStore` / `getStoreSnapshot` | Reactive client updates without hydration loops |
| Seed project + tasks | Demo data on first visit |

---

## 5. User Acceptance Testing (UAT) Log & Refinement Iterations

Wave 1 UAT was executed against the integrated product. Five checks were defined; all **passed** after post-UAT refinements.

### 5.1 UAT matrix

| Check | Scenario | Expected behaviour | Result |
|-------|----------|--------------------|--------|
| **1** | **View Switcher** | Smooth transition between List View and Kanban View (To Do, Doing, Completed) | **PASS** |
| **2** | **Drag-and-Drop Kanban** | Cards slide across columns; status updates instantly and persists in store | **PASS** |
| **3** | **Detail Drawer** | Clicking a task card opens the right-aligned slide-over drawer | **PASS** |
| **4** | **Planner Fields & Hover Tooltips** | Live field updates; checklist progress; disabled buttons show **instant** tooltips (no browser delay) | **PASS** *(after iteration)* |
| **5** | **Multi-Date Tracking & Input Fix** | Native HTML5 date pickers; smooth keyboard entry for DD/MM/YYYY; no focus loss when typing 4-digit years | **PASS** *(after iteration)* |

### 5.2 UAT Check 4 — iteration detail

**User feedback:** Disabled primary buttons (e.g. “Add checklist item”, “Post comment”) showed no helpful guidance, or only after a long native tooltip delay.

**Resolution:**

- Replaced HTML `title` attributes with instant Tailwind `group-hover` tooltips (`transition-none duration-0`)
- Wrapped disabled buttons so hover works despite `pointer-events` on `<button disabled>`
- Australian English copy:
  - Checklist: *“Please enter a checklist item name first”*
  - Comment: *“Please enter comment text first”*
  - Add task (project page): *“Please enter a task title first”*

**Files:** `TaskDetailDrawer.tsx`, `ProjectDetailView.tsx`

### 5.3 UAT Check 5 — iteration detail

**User feedback:** Manual keyboard entry in date fields lost focus or truncated digits (e.g. typing `2026` corrupted the year).

**Resolution:**

- Date inputs use **uncontrolled** `type="date"` with `defaultValue`
- Parent store syncs **only on `onBlur`**, not on every keystroke
- Prevents React re-render cycles from resetting the native date control mid-edit
- DD/MM/YYYY captions shown below each field (Australian English)

**Files:** `TaskDetailDrawer.tsx` (`AuDateField` component)

### 5.4 Additional refinements (post-UAT)

| Issue | Resolution | Files |
|-------|------------|-------|
| `getServerSnapshot should be cached` React warning | Module-level `SERVER_SNAPSHOT` constant returned by `getServerServerSnapshot()` | `src/lib/store.ts` |
| Top banner / project card contrast | Slate header (`bg-slate-800`) on zinc canvas; white project cards with subtle shadow | `app/layout.tsx`, `app/page.tsx` |
| Redundant secondary page title | Removed duplicate “Simple Project Task Tracker 2.0” label below header; page opens with **Projects** heading only | `app/page.tsx` |
| Drawer horizontal overflow | `overflow-x-hidden overflow-y-auto max-w-full min-w-0` on scroll container; checklist form `flex-col sm:flex-row w-full min-w-0`; input `flex-1 min-w-0`, button `shrink-0` | `TaskDetailDrawer.tsx` |
| Workspace reliability | Migrated repo from OneDrive to `/Users/yugoananda/Cursor Project/Simple Project Task Tracker 2.0/`; re-cloned from GitHub and overlaid Wave 1 files | — |

### 5.5 UAT conclusion

**All five Wave 1 verification scenarios passed.** Wave 1 is closed and ready for Wave 2 kick-off per `dev_plan.md` Section 7.

---

## 6. Step-by-Step Replication Manual (How to Recreate Wave 1)

Follow this recipe from a clean macOS environment to reproduce the exact Wave 1 product state.

### Phase A — Scaffold and blueprint

1. Create the project folder and scaffold Next.js (Section 2.2).
2. Initialise git and push to GitHub (Section 2.3).
3. Generate or copy `doc/dev_plan.md` (Section 3).
4. Install dependencies (Section 2.5):
   ```bash
   npm install @hello-pangea/dnd lucide-react
   ```

### Phase B — Domain and UI (AI-assisted or manual)

5. Create `src/lib/types.ts` with all Wave 1 domain types (Step 1).
6. Create Kanban components (Step 2):
   - `src/components/kanban/TaskCard.tsx`
   - `src/components/kanban/KanbanColumn.tsx`
   - `src/components/kanban/KanbanBoard.tsx`
7. Create `src/components/kanban/TaskDetailDrawer.tsx` (Step 3).
8. Create Wave 1 store and integration layer (Step 4):
   - `src/lib/store.ts`
   - `src/components/tasks/TaskListView.tsx`
   - `src/components/projects/ProjectDetailView.tsx`
   - `app/page.tsx`, `app/layout.tsx`, `app/projects/[id]/page.tsx`
   - `app/globals.css` (view fade animation)

### Phase C — Verify

9. Run quality checks:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   npm run dev
   ```
10. Manual smoke test:
    - Home page lists seed project **Website Redesign**
    - Open project → toggle List / Kanban
    - Drag task between columns
    - Click task → drawer opens; edit fields, checklist, comment placeholder
    - Confirm disabled-button tooltips appear instantly
    - Confirm date fields accept keyboard entry without focus loss

### Phase D — UAT refinements (include in replication)

11. Apply post-UAT fixes documented in Section 5 (tooltips, date blur-sync, layout overflow, contrast, `SERVER_SNAPSHOT`).
12. Re-run build and repeat UAT matrix (Section 5.1).

### Phase E — Optional local domain

13. Add hosts entry (Section 2.4) when ready to test under `tracker.local`.

---

## Appendix A — Wave 1 file inventory

| Path | Role |
|------|------|
| `doc/dev_plan.md` | North Star blueprint |
| `doc/dev_proc.md` | This execution log |
| `src/lib/types.ts` | Domain types |
| `src/lib/store.ts` | Wave 1 LocalStorage store + `SERVER_SNAPSHOT` |
| `src/components/kanban/TaskCard.tsx` | Draggable task card |
| `src/components/kanban/KanbanColumn.tsx` | Droppable column |
| `src/components/kanban/KanbanBoard.tsx` | Drag-and-drop board |
| `src/components/kanban/TaskDetailDrawer.tsx` | Planner-style drawer |
| `src/components/tasks/TaskListView.tsx` | Traditional list view |
| `src/components/projects/ProjectDetailView.tsx` | Project hub + view switcher |
| `app/page.tsx` | Home — project list |
| `app/layout.tsx` | Root layout + header |
| `app/projects/[id]/page.tsx` | Project detail route |
| `app/globals.css` | Global styles + view fade |

---

## Appendix B — Wave completion tracker

| Wave | Focus | Status |
|------|-------|--------|
| **Wave 1** | F-201 Kanban + F-202 Planner drawer (client UI) | **Complete — UAT verified** |
| **Wave 2** | Supabase Auth, PostgreSQL/Prisma, RBAC (F-203) | Not started |
| **Wave 3** | Gantt, analytics, cloud comments (F-204, F-205, F-202 comments) | Not started |

---

*End of Wave 1 log. Wave 2 entries will be appended below this line without rewriting completed history.*
