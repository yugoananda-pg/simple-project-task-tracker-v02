# Simple Project Task Tracker 2.0 — Development Process & Execution Log

**Document:** `dev_proc.md`  
**Product:** Simple Project Task Tracker 2.0  
**Language:** Australian English  
**Companion blueprint:** [`./doc/dev_plan.md`](./dev_plan.md)  
**Repository:** `https://github.com/yugoananda-pg/simple-project-task-tracker-v02.git`  
**Last updated:** 9 September 2026  

---

## 1. Executive Summary & Process Intent

This document is the **living engineering journal** and **step-by-step replication manual** for Simple Project Task Tracker 2.0. It records everything required to recreate the product state achieved at the end of each Wave — not only *what* was built, but *how* it was built.

`dev_proc.md` captures:

- Environment preparation and Terminal commands (including steps run manually on macOS before or outside AI sessions)
- AI prompts (or prompt intent) used to drive implementation
- Files created or modified, and the architectural outcome of each step
- User Acceptance Testing (UAT) scenarios, results, feedback, and post-UAT refinements
- A concise replication recipe so any human engineer or future AI collaborator can rebuild the same product state

**Scope of this edition:** Waves 1, 2, and 3 are **100% complete and UAT-verified** against the live Supabase PostgreSQL database. Wave 3 delivered cloud task comments (F-202), the interactive Gantt chart (F-204), the analytics dashboard (F-205), multi-view tab navigation, flexible PIC assignment, seed/RLS hardening, and the full iterative UAT fix series documented in Sections 13–16.

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
| **Wave 2** | Supabase Auth, PostgreSQL/Prisma, RBAC (F-203) | **Complete — UAT verified** |
| **Wave 3** | Gantt, analytics, cloud comments (F-204, F-205, F-202 comments) | **Complete — UAT verified** |

---

## 7. Wave 2 Overview & Architectural Shift

Wave 2 transitions Simple Project Task Tracker 2.0 from the Wave 1 **LocalStorage MVP** to a **full-stack cloud architecture**. All project, task, and user profile data now persists in **Supabase PostgreSQL**; authentication is handled by **Supabase Auth**; and the application layer uses **Next.js App Router** Server Actions with **Prisma 7 ORM** and a PostgreSQL driver adapter.

### 7.1 Before and after

| Aspect | Wave 1 | Wave 2 |
|--------|--------|--------|
| **Persistence** | Browser `LocalStorage` (`src/lib/store.ts`) | Supabase PostgreSQL via Prisma 7 |
| **Authentication** | None (open client UI) | Supabase Auth (email/password) |
| **Authorisation** | None | RBAC engine (`super_pm`, `pm`, `member`, `viewer`) |
| **Data access** | Client-side store mutations | Server Actions + middleware route protection |
| **Session** | N/A | Cookie-based SSR session via `@supabase/ssr` |

### 7.2 Architectural layers

```
Browser (React client components)
    ↓ Server Actions / server components
Next.js App Router (app/, src/lib/actions/)
    ↓ RBAC checks (src/lib/rbac.ts)
Prisma 7 Client + @prisma/adapter-pg (src/lib/prisma.ts)
    ↓ DATABASE_URL (Supabase transaction pooler, port 6543)
Supabase PostgreSQL

Supabase Auth ←→ @supabase/ssr (client, server, middleware)
    ↓ Session cookies refreshed in src/middleware.ts
Protected routes: /, /projects, /projects/*
```

### 7.3 Key design decisions

- **Prisma 7 configuration:** Database URLs live in `prisma.config.ts` (not in `schema.prisma`). Migrations use `DIRECT_URL` (session pooler, port 5432); runtime queries use `DATABASE_URL` (transaction pooler, port 6543).
- **Supabase IPv4 pooler:** Direct connection to `db.*.supabase.co` failed on macOS (IPv6-only host). All connections were routed through **`aws-0-ap-northeast-1.pooler.supabase.com`**.
- **Profile bootstrap:** On first sign-in/sign-up, a `User` row is created in PostgreSQL keyed by Supabase Auth UUID. The **first registered user** is auto-promoted to **`super_pm`**; all subsequent users default to **`member`**.
- **Wave 1 UI preserved:** Kanban, List View, and Task Detail Drawer components were retained and rewired to Server Actions rather than LocalStorage.

### 7.4 Wave 2 feature coverage

| Feature ID | Capability | Status |
|------------|------------|--------|
| **F-203** | RBAC — Super PM / PM / Member / Viewer | **Delivered** |
| **F-201** | Kanban drag-and-drop (cloud-backed) | **Delivered** |
| **F-202** | Planner-style task details (cloud-backed) | **Delivered** |
| **F-204–F-206** | Gantt, analytics, `tracker.local` | Deferred to Wave 3 |

---

## 8. Wave 2 — Terminal Commands & Environment Setup Log (macOS / Cursor Terminal)

The following operations were executed on macOS in the Cursor Terminal. Steps marked **(manual)** occurred outside AI awareness and are recorded here for exact replication.

### 8.1 Package installation

```bash
cd "/Users/yugoananda/Cursor Project/Simple Project Task Tracker 2.0"

# Supabase Auth + Prisma ORM
npm install @supabase/supabase-js @supabase/ssr @prisma/client

# Prisma CLI (dev dependency)
npm install -D prisma

# Prisma 7 PostgreSQL driver adapter (required at runtime)
npm install @prisma/adapter-pg pg
npm install -D @types/pg   # if TypeScript types are needed separately
```

### 8.2 Environment configuration (`.env.local`)

Create or update `.env.local` in the project root with Supabase project credentials. **Do not commit this file.**

**Password URL encoding:** If the database password contains special characters (e.g. `@`), encode them for the connection string. Example: `NewMoon@2026` → `NewMoon%402026`.

**Supabase pooler endpoints (ap-northeast-1):**

| Variable | Purpose | Host / port |
|----------|---------|-------------|
| `DIRECT_URL` | Prisma migrations & CLI (`prisma migrate dev`) | `aws-0-ap-northeast-1.pooler.supabase.com:5432` (Session pooler) |
| `DATABASE_URL` | Application runtime queries | `aws-0-ap-northeast-1.pooler.supabase.com:6543` (Transaction pooler) |

Example structure (replace placeholders with your Supabase project values):

```env
# Supabase Auth (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# PostgreSQL — Session pooler (migrations / DIRECT_URL)
DIRECT_URL=postgresql://postgres.<project-ref>:NewMoon%402026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres

# PostgreSQL — Transaction pooler (runtime / DATABASE_URL)
DATABASE_URL=postgresql://postgres.<project-ref>:NewMoon%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

> **Connectivity note:** Attempting to connect via `db.<project-ref>.supabase.co` returned **P1001** (host unreachable) on macOS due to IPv6-only resolution. The Supavisor IPv4 pooler host above resolved the issue.

### 8.3 Prisma initialisation and migration

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Apply initial migration to Supabase PostgreSQL
npx prisma migrate dev --name init
```

**Outcome:** Migration `prisma/migrations/20260828233113_init/` applied successfully. Tables `User`, `Project`, `ProjectMember`, `Task`, `Subtask`, and `TaskComment` created with UUID primary keys and cascade delete rules.

### 8.4 Git checkpoints **(manual)**

```bash
git add .
git commit -m "feat(wave-2): setup prisma schema and apply initial supabase postgresql migration"
git push origin main
```

Additional Wave 2 implementation files (auth, RBAC, Server Actions, UI integration, UAT refinements) were developed iteratively in Cursor AI sessions. Commit and push after each stable checkpoint using the same pattern:

```bash
git add .
git commit -m "<concise message describing the Wave 2 milestone>"
git push origin main
```

### 8.5 Quality verification

```bash
npm run lint
npm run build
npm run dev
# Open http://localhost:3000 — sign in, create project, drag Kanban cards, refresh to confirm persistence
```

---

## 9. Wave 2 Technical Implementation Steps

---

### Step 1 — Backend & Database Schema Setup

| | |
|--|--|
| **Feature** | F-203 foundation — PostgreSQL persistence layer |
| **Prompt (summary)** | Define Prisma schema aligned to `dev_plan.md` Section 3; configure Prisma 7 with external datasource URLs; apply initial migration to Supabase. |
| **Files created** | `prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/20260828233113_init/migration.sql`, `src/lib/prisma.ts`, `src/lib/mappers.ts` |
| **Outcome** | Full relational schema with UUID PKs, enums, and cascade relationships. Prisma Client generated with `@prisma/adapter-pg` singleton for Next.js hot-reload safety. |

#### Schema entities (`prisma/schema.prisma`)

| Model | Purpose | Key relationships |
|-------|---------|-------------------|
| **User** | Profile row keyed by Supabase Auth UUID | Owns projects; project membership; task assignment; comments |
| **Project** | Top-level workspace | `ownerId` → User; has many Tasks and ProjectMembers |
| **ProjectMember** | Join table for permitted users | `projectId` + `userId` unique; cascade on delete |
| **Task** | Kanban/list work item | Belongs to Project; optional assignee; status/priority/bucket enums |
| **Subtask** | Checklist item on a Task | Cascade delete with parent Task |
| **TaskComment** | Comment on a Task | Links Task and User; cascade delete |

#### Enums

| Enum | Values |
|------|--------|
| `GlobalRole` | `super_pm`, `pm`, `member`, `viewer` |
| `TaskStatus` | `todo`, `in_progress`, `done` |
| `TaskPriority` | `urgent`, `important`, `medium`, `low` |
| `TaskBucket` | `initiating`, `planning`, `executing`, `monitoring`, `closing` |

#### Prisma 7 configuration (`prisma.config.ts`)

- Loads `.env.local` via `dotenv`
- Points migrations at `DIRECT_URL` (session pooler, port 5432)
- Schema path: `prisma/schema.prisma`

#### Runtime client (`src/lib/prisma.ts`)

- Uses `PrismaPg` adapter with `DATABASE_URL` (transaction pooler, port 6543)
- Module-level singleton prevents connection exhaustion during `next dev` hot reload

---

### Step 2 — Supabase Auth Helpers & Route Protection Middleware

| | |
|--|--|
| **Feature** | Authentication + session management |
| **Prompt (summary)** | Implement Supabase SSR helpers for browser, server, and middleware; protect app routes; create login and register pages. |
| **Files created** | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/lib/supabase/env.ts`, `src/middleware.ts`, `app/login/page.tsx`, `app/register/page.tsx`, `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`, `src/components/auth/auth-validation.ts` |
| **Outcome** | Cookie-based auth sessions; unauthenticated users redirected to `/login`; authenticated users redirected away from `/login` and `/register`. |

#### Middleware behaviour (`src/middleware.ts` + `src/lib/supabase/middleware.ts`)

| Route pattern | Unauthenticated | Authenticated |
|---------------|-----------------|---------------|
| `/`, `/projects`, `/projects/*` | Redirect → `/login?redirectTo=…` | Allow |
| `/login`, `/register` | Allow | Redirect → `/` |
| Static assets, `_next/*` | Excluded from matcher | Excluded |

Session cookies are refreshed on every matched request via `supabase.auth.getUser()`.

---

### Step 3 — RBAC Engine & Server Actions

| | |
|--|--|
| **Feature ID** | F-203 |
| **Prompt (summary)** | Implement role-based access control and Server Actions for auth, projects, and tasks; bootstrap first user as Super PM. |
| **Files created** | `src/lib/rbac.ts`, `src/lib/actions/auth.ts`, `src/lib/actions/projects.ts`, `src/lib/actions/tasks.ts`, `src/lib/actions/errors.ts`, `src/lib/role-labels.ts` |
| **Outcome** | All mutations authorised server-side before touching PostgreSQL. Client receives mapped DTOs via `src/lib/mappers.ts`. |

#### RBAC privilege matrix (implemented)

| Role | Project visibility | Create project | Project admin (edit/delete project) | Task CRUD | Kanban status moves |
|------|-------------------|----------------|---------------------|-----------|---------------------|
| **Super PM** | All projects | Yes | All projects | All tasks | All tasks |
| **PM** | Owned + member projects | Yes | Owned projects only | Owned projects (admin); member projects (read) | Owned projects (admin) |
| **Member** | Member projects only | No | No | Member projects (write) | Member projects (write) |
| **Viewer** | Member projects only | No | No | Read-only | No |

#### Access level resolution (`getProjectAccess`)

| Level | Meaning |
|-------|---------|
| `admin` | Full project and task management |
| `write` | Task CRUD and Kanban moves |
| `read` | View-only |
| `none` | Hidden / forbidden |

#### Profile bootstrap (`bootstrapUserProfile` in `src/lib/rbac.ts`)

1. On sign-in or sign-up, check if a `User` row exists for the Supabase Auth UUID.
2. If not, count existing users: **count === 0 → `super_pm`**; otherwise **`member`**.
3. Create profile with email, name (from metadata or email prefix), and assigned role.

#### Server Actions summary

| Module | Actions |
|--------|---------|
| `src/lib/actions/auth.ts` | `signInAction`, `signUpAction`, `signOutAction` |
| `src/lib/actions/projects.ts` | `listProjects`, `getProject`, `createProject`, `updateProject`, `deleteProject` |
| `src/lib/actions/tasks.ts` | `createTask`, `updateTaskFields`, `updateTaskStatus`, `addSubtask`, `toggleSubtask`, `addComment` |

All actions return `ActionResult<T>` with Australian English error messages via `ActionError`.

---

### Step 4 — UI & Cloud Database Integration

| | |
|--|--|
| **Feature IDs** | F-201, F-202 (cloud-backed) |
| **Prompt (summary)** | Wire home page and project detail views to Server Actions; add authenticated header; enable "+ New Project" modal for authorised roles. |
| **Files created/modified** | `src/components/layout/AppHeader.tsx`, `src/components/projects/HomePageClient.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/projects/[id]/page.tsx`, `src/components/projects/ProjectDetailView.tsx`, Kanban components (task mutation callbacks) |
| **Outcome** | End-to-end cloud product: sign in → project list from PostgreSQL → project hub with List/Kanban → task drawer edits persisted via Server Actions. |

#### Integration highlights

| Component | Change |
|-----------|--------|
| `app/page.tsx` | Server component fetches projects via `listProjects()`; passes to `HomePageClient` |
| `HomePageClient.tsx` | Project cards from database; "+ New Project" modal calls `createProject` Server Action |
| `app/projects/[id]/page.tsx` | Server fetch of project + tasks with RBAC access level |
| `ProjectDetailView.tsx` | Replaces `src/lib/store.ts` mutations with Server Actions; respects `canWriteTasks` / read-only mode |
| `AppHeader.tsx` | Displays session user, role badge, sign-out; hides "Projects" nav when signed out |

> **Note:** `src/lib/store.ts` remains in the repository as Wave 1 reference but is no longer used by main application routes.

---

## 10. Wave 2 User Acceptance Testing (UAT) Log & Results

Wave 2 UAT was executed against the **live Supabase PostgreSQL database**. Four official scenarios were defined; all **passed**.

### 10.1 UAT matrix

| Check | Scenario | Expected behaviour | Result |
|-------|----------|--------------------|--------|
| **1** | **First User Registration & Super PM Promotion** | First account registers successfully and receives `super_pm` role badge in AppHeader | **PASS** |
| **2** | **Project Creation & Supabase Cloud Persistence** | "+ New Project" modal creates a row persisted in PostgreSQL | **PASS** |
| **3** | **Kanban Drag-and-Drop & Cloud Sync** | Card movements and task drawer edits survive browser refresh | **PASS** |
| **4** | **Multi-User RBAC Boundaries** | Second user registers as `member` with strict access restrictions | **PASS** |

### 10.2 UAT Check 1 — First User Registration & Super PM Promotion

| Field | Detail |
|-------|--------|
| **Test account** | `yugo@example.com` |
| **Steps** | Register via `/register` → redirected to home → inspect AppHeader role badge |
| **Verified** | User profile created in `User` table with `globalRole = super_pm`; badge displays **Super PM** |
| **Result** | **PASS** |

### 10.3 UAT Check 2 — Project Creation & Supabase Cloud Persistence

| Field | Detail |
|-------|--------|
| **Steps** | Sign in as Super PM → click "+ New Project" → submit name and description → refresh page |
| **Verified** | Project appears in home list after refresh; Supabase SQL Editor confirms row: `SELECT * FROM "Project";` |
| **Result** | **PASS** |

### 10.4 UAT Check 3 — Kanban Drag-and-Drop & Cloud Sync

| Field | Detail |
|-------|--------|
| **Steps** | Open project → Kanban View → drag task between columns → open task drawer → edit title/description → hard refresh browser |
| **Verified** | Task `status` and field updates persisted in PostgreSQL; UI reflects stored state after reload |
| **Result** | **PASS** |

### 10.5 UAT Check 4 — Multi-User RBAC Boundaries

| Field | Detail |
|-------|--------|
| **Test account** | `member@example.com` |
| **Steps** | Register second user → confirm role badge → attempt to access projects not assigned via `ProjectMember` |
| **Verified** | Second user auto-assigned `member` role; "+ New Project" hidden; only member-assigned projects visible; task mutations blocked on non-member projects |
| **Result** | **PASS** |

### 10.6 UAT conclusion

**All four Wave 2 verification scenarios passed.** Wave 2 is closed and ready for Wave 3 kick-off per `dev_plan.md` Section 7.

---

## 11. Wave 2 UX Refinements & Performance Iterations

Following core Wave 2 UAT, eight post-UAT enhancements were implemented to improve usability, performance, and terminology alignment.

### 11.1 Refinement summary

| # | Enhancement | Description | Files |
|---|-------------|-------------|-------|
| **1** | **Header Navigation** | Hide "Projects" nav link for unauthenticated users | `src/components/layout/AppHeader.tsx` |
| **2** | **Password Visibility** | Lucide `Eye` / `EyeOff` show/hide toggle on Login and Register forms | `src/components/auth/PasswordInput.tsx`, `LoginForm.tsx`, `RegisterForm.tsx` |
| **3** | **Multi-Tab Sync** | Global `onAuthStateChange` listener + `BroadcastChannel` + window focus refresh to synchronise login/logout/email verification across browser tabs | `src/components/providers/AuthSessionProvider.tsx`, `app/layout.tsx` |
| **4** | **User Account Header** | Refactored crowded header into `UserDropdownMenu.tsx` — user name, email, role badge, Settings placeholder, Sign Out | `src/components/layout/UserDropdownMenu.tsx`, `AppHeader.tsx` |
| **5** | **PMBOK Terminology Alignment** | Renamed UI label "Bucket" to **Process Group** (Initiating, Planning, Executing, Monitoring, Closing); database field remains `bucket` | `TaskDetailDrawer.tsx`, `TaskCard.tsx` |
| **6** | **Optimistic Kanban Drag-and-Drop** | Instant local status update on drag with server sync; rollback to snapshot on Server Action failure | `ProjectDetailView.tsx` (`handleStatusChange`) |
| **7** | **Task Drawer Input Lag Fix** | Local draft state buffering; title/description commit on `onBlur` to eliminate keystroke re-render focus loss | `TaskDetailDrawer.tsx` |
| **8** | **Home Page Hero Text & Fluid Layout** | Updated copy to *"Select a project to switch seamlessly between List and Kanban views, and manage detailed task workflows."*; fluid `max-w-3xl w-full` responsive styling | `src/components/projects/HomePageClient.tsx` |

### 11.2 Multi-Tab Sync — implementation detail

`AuthSessionProvider` wraps the app in `app/layout.tsx` and:

1. Subscribes to `supabase.auth.onAuthStateChange` → calls `router.refresh()`
2. Broadcasts auth events to other tabs via `BroadcastChannel("sptt-auth-sync")`
3. Refreshes session on window focus as a fallback when BroadcastChannel is unavailable

### 11.3 Optimistic Kanban — implementation detail

`ProjectDetailView.handleStatusChange`:

1. Captures a `snapshot` of the current tasks array
2. Applies optimistic `status` update immediately in local state
3. Calls `updateTaskStatus` Server Action
4. On failure: restores `snapshot` and surfaces error message
5. On success: merges server response and calls `router.refresh()`

---

## 12. Step-by-Step Replication Manual (Wave 2)

Follow this recipe from the **Wave 1 complete state** (Section 6) to reproduce the exact Wave 2 full-stack product.

### Phase A — Dependencies and environment

1. Ensure Wave 1 codebase is present (Section 6, Phases A–D).
2. Install Wave 2 packages (Section 8.1):
   ```bash
   npm install @supabase/supabase-js @supabase/ssr @prisma/client @prisma/adapter-pg pg
   npm install -D prisma
   ```
3. Create a Supabase project (PostgreSQL + Auth enabled).
4. Configure `.env.local` (Section 8.2):
   - URL-encode special characters in the database password
   - Use IPv4 pooler host `aws-0-ap-northeast-1.pooler.supabase.com`
   - Port **5432** for `DIRECT_URL`; port **6543** for `DATABASE_URL`
5. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Phase B — Database schema

6. Create `prisma/schema.prisma` with all models and enums (Step 1, Section 9).
7. Create `prisma.config.ts` pointing migrations at `DIRECT_URL`.
8. Run:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
9. Create `src/lib/prisma.ts` with `PrismaPg` adapter singleton.
10. Create `src/lib/mappers.ts` for Prisma → application DTO mapping.

### Phase C — Authentication

11. Create Supabase helpers:
    - `src/lib/supabase/client.ts`
    - `src/lib/supabase/server.ts`
    - `src/lib/supabase/middleware.ts`
    - `src/lib/supabase/env.ts`
12. Create `src/middleware.ts` with route protection matcher.
13. Create auth pages and forms:
    - `app/login/page.tsx`, `app/register/page.tsx`
    - `src/components/auth/LoginForm.tsx`, `RegisterForm.tsx`, `auth-validation.ts`

### Phase D — RBAC and Server Actions

14. Implement `src/lib/rbac.ts` (session user, project access, bootstrap logic).
15. Implement Server Actions:
    - `src/lib/actions/errors.ts`
    - `src/lib/actions/auth.ts`
    - `src/lib/actions/projects.ts`
    - `src/lib/actions/tasks.ts`
16. Add `src/lib/role-labels.ts` for shared role display labels.

### Phase E — UI integration

17. Create `src/components/layout/AppHeader.tsx`.
18. Refactor `app/page.tsx` to server-fetch projects; create `HomePageClient.tsx` with "+ New Project" modal.
19. Update `app/projects/[id]/page.tsx` to server-fetch project + tasks with RBAC.
20. Rewire `ProjectDetailView.tsx` to Server Actions (replace LocalStorage store calls).
21. Update `app/layout.tsx` to include `AppHeader` and session provider.

### Phase F — Post-UAT refinements

22. Apply all eight refinements documented in Section 11.
23. Re-run quality checks:
    ```bash
    npm run lint
    npm run build
    ```

### Phase G — UAT verification

24. Execute the four UAT scenarios (Section 10):
    - Register first user → confirm Super PM badge
    - Create project → verify in Supabase SQL Editor
    - Drag Kanban cards and edit drawer → refresh → confirm persistence
    - Register second user → confirm Member restrictions

25. Commit and push:
    ```bash
    git add .
    git commit -m "feat(wave-2): complete full-stack cloud architecture with RBAC"
    git push origin main
    ```

---

## Appendix C — Wave 2 file inventory

| Path | Role |
|------|------|
| `prisma/schema.prisma` | PostgreSQL schema — models, enums, relationships |
| `prisma.config.ts` | Prisma 7 config — migration datasource URL |
| `prisma/migrations/20260828233113_init/` | Initial migration SQL |
| `src/lib/prisma.ts` | Prisma Client singleton with PG adapter |
| `src/lib/mappers.ts` | Prisma → application type mappers |
| `src/lib/rbac.ts` | RBAC engine — session, access levels, bootstrap |
| `src/lib/role-labels.ts` | Shared role display labels |
| `src/lib/actions/auth.ts` | Sign in, sign up, sign out Server Actions |
| `src/lib/actions/projects.ts` | Project CRUD Server Actions |
| `src/lib/actions/tasks.ts` | Task CRUD Server Actions |
| `src/lib/actions/errors.ts` | ActionResult types and error helpers |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client (cookies) |
| `src/lib/supabase/middleware.ts` | Session refresh + route guards |
| `src/lib/supabase/env.ts` | Environment variable validation |
| `src/middleware.ts` | Next.js middleware entry |
| `app/login/page.tsx` | Login route |
| `app/register/page.tsx` | Register route |
| `src/components/auth/LoginForm.tsx` | Login form |
| `src/components/auth/RegisterForm.tsx` | Register form |
| `src/components/auth/PasswordInput.tsx` | Password field with visibility toggle |
| `src/components/auth/auth-validation.ts` | Client-side validation helpers |
| `src/components/layout/AppHeader.tsx` | Authenticated app header |
| `src/components/layout/UserDropdownMenu.tsx` | User account dropdown |
| `src/components/providers/AuthSessionProvider.tsx` | Multi-tab auth sync |
| `src/components/projects/HomePageClient.tsx` | Home page client — project list + modal |
| `src/components/projects/ProjectDetailView.tsx` | Project hub — cloud-backed mutations |
| `.env.local` | Supabase credentials *(local only — not committed)* |

---

*End of Wave 2 log. Wave 3 entries begin below without rewriting completed history.*

---

## 13. Wave 3 Overview & Feature Scope

Wave 3 completes the Version 2.0 North Star by delivering collaboration and insight surfaces on top of the Wave 2 cloud + RBAC foundation.

### 13.1 Feature coverage

| Feature ID | Capability | Status |
|------------|------------|--------|
| **F-202 (comments)** | Cloud-synced `TaskComment` Server Actions + drawer UI | **Delivered** |
| **F-204** | Interactive Gantt chart (Initial / Updated / Actual bars, Week/Month, freeze-panes) | **Delivered** |
| **F-205** | Project analytics dashboard (Recharts + KPI cards + overdue panel) | **Delivered** |
| **F-202 (PIC)** | Flexible assignee: registered member **or** custom free-text PIC (`assigneeName`) | **Delivered** |
| **Multi-view hub** | Project tabs: List \| Kanban \| Gantt \| Analytics | **Delivered** |
| **Hardening** | Delete project/task, Wave 3 UAT seed, RLS enablement, progress/`sortOrder` schema | **Delivered** |

### 13.2 Architectural additions

```
ProjectDetailView (viewMode: list | kanban | gantt | analytics)
    ├── TaskListView / KanbanBoard / TaskDetailDrawer
    ├── ProjectGanttView  ← src/lib/gantt/date-utils.ts
    ├── ProjectAnalyticsView  ← src/lib/analytics/task-metrics.ts
    └── Comments  ← src/lib/actions/comments.ts (Prisma TaskComment)

Seed / reset  ← prisma/seed.ts → src/lib/seed/database-seed.ts
Permissions   ← src/lib/permissions.ts + rbac.ts (read-only Viewer guards)
```

### 13.3 Dependencies installed during Wave 3

```bash
cd "/Users/yugoananda/Cursor Project/Simple Project Task Tracker 2.0"
npm install date-fns recharts
npm install -D tsx   # required for prisma/seed.ts via package.json prisma.seed
```

---

## 14. Wave 3 Detailed Execution Phase & Prompt Log

Each step below records the **exact user prompt** used in Cursor, the files touched, and the architectural outcome. Follow the steps in chronological order to recreate Wave 3 at the same quality level.

---

### Step 1 — Task Comments Cloud Persistence & Integration (F-202)

**Date:** Sunday, 30 August 2026  

#### Exact prompt

> Hi Cursor, we are starting Wave 3 - Step 1: Task Comments Cloud Persistence & Integration.
>
> Please implement the following updates:
>
> 1. Task Comments Server Actions (`src/lib/actions/comments.ts`):
>    - Build authenticated Server Actions backed by Prisma PostgreSQL:
>      * `getTaskComments(taskId: string)`: Fetch all comments for a task ordered by `createdAt` ascending, including author details (`id`, `name`, `email`).
>      * `createComment(taskId: string, content: string)`: Verify active session and project access permissions (Member+), then create a new `TaskComment` record.
>      * `deleteComment(commentId: string)`: Allow the comment author, project owner (PM), or Super PM to delete a comment.
>
> 2. Wire Cloud Comments in TaskDetailDrawer (`src/components/kanban/TaskDetailDrawer.tsx`):
>    - Replace the "Wave 3 Placeholder" badge in the Comments section with live comment interactions.
>    - Fetch real-time comments when a task drawer is opened.
>    - Display comments in a clean list showing the author's name, initial avatar, comment content, and formatted Australian English timestamps (`DD/MM/YYYY, HH:mm`).
>    - Wire the "Post comment" form to invoke the `createComment` server action, clearing the input field and refreshing the list immediately upon submission.
>
> Ensure strict TypeScript compliance, clean and consistent mode Tailwind styling, and natural Australian English copy.

#### Outcome

| | |
|--|--|
| **Files** | `src/lib/actions/comments.ts` *(created)*; `TaskDetailDrawer.tsx` *(wired)*; `ProjectDetailView.tsx` *(callback wiring)* |
| **RBAC** | Write roles (Member+) post; delete for author / owning PM / Super PM; Viewers blocked with Australian English messaging |
| **Result** | Comments persist in PostgreSQL and appear immediately in the drawer after post |

---

### Step 2 — Interactive Gantt Chart View (F-204)

**Date:** Sunday, 30 August 2026  

#### Exact prompt

> Hi Cursor, we are moving to Wave 3 - Step 2: Interactive Gantt Chart View (F-204).
>
> Please implement the Gantt Chart component and logic:
>
> 1. Create Gantt Chart Component (`src/components/gantt/ProjectGanttView.tsx`):
>    - Build a clean timeline view rendering horizontal task bars mapped across weeks/months.
>    - Display planned durations (plannedStartDate to plannedDueDate) alongside actual durations (actualStartDate to actualCompletionDate).
>    - Color code bars by status (To Do, In Progress, Completed) and highlight overdue tasks.
>    - Add grouping toggles to group timeline rows by:
>      * Task List (Default)
>      * Assignee / PIC
>      * Process Group (Initiating, Planning, Executing, Monitoring, Closing)
>
> 2. Defensive Date & Integrity Safeguards:
>    - Handle edge cases safely (e.g., missing start/due dates, inverted date ranges where start > due, or corrupt strings).
>    - Render fallback indicators or clamp invalid dates without crashing the chart or throwing React errors.
>
> 3. Interactivity & Drawer Wiring:
>    - Clicking any task row or timeline bar opens the `TaskDetailDrawer` for that specific task.
>    - Integrate `date-fns` for clean date math and Australian English formatting (`DD/MM/YYYY`).
>
> Ensure high contrast dark mode styling and strict TypeScript types.

#### Outcome

| | |
|--|--|
| **Files** | `src/components/gantt/ProjectGanttView.tsx`, `src/lib/gantt/date-utils.ts` *(created)* |
| **Note** | Later UAT renamed planned → **initial** dates and evolved grouping to **Task list** (by Process Group) + **Assignee / PIC** only; Week/Month scale restored. See Section 15. |
| **Result** | First interactive Gantt surface integrated into the project hub |

---

### Step 3 — Project Progress Dashboard & Analytics (F-205) + Multi-View Tabs

**Date:** Sunday, 30 August 2026  

#### Exact prompt

> Hi Cursor, we are moving to Wave 3 - Step 3: Project Progress Dashboard & Analytics (F-205).
>
> Please implement the Analytics Dashboard component and integrate it into our project view:
>
> 1. Create Analytics View Component (`src/components/analytics/ProjectAnalyticsView.tsx`):
>    - Use `recharts` to build a clean, high-contrast dark-mode analytics dashboard.
>    - Include the following widgets & charts:
>      * Key Performance Cards: Total Tasks, Completion Percentage (%), Overdue Tasks Count, and Active Assignees Count.
>      * Status Distribution Chart: Recharts Pie/Donut Chart visualising To Do (amber), In Progress (sky), and Completed (emerald) proportions.
>      * Workload per PIC Chart: Recharts Bar Chart showing open vs completed task counts grouped by assignee/PIC name.
>      * Process Group Breakdown: Visual progress bars or distribution table across Process Groups (Initiating, Planning, Executing, Monitoring, Closing).
>      * Overdue Tasks Alert Panel: Clean list detailing all overdue tasks with assignee names and days overdue.
>
> 2. Empty State & Defensive Logic:
>    - Handle empty projects gracefully without chart rendering errors, showing friendly empty state messages in Australian English when no task data exists.
>
> 3. Tab Integration (`src/components/projects/ProjectDetailView.tsx`):
>    - Add the "Analytics" tab to the project view switcher: [ List View ] | [ Kanban Board ] | [ Gantt Chart ] | [ Analytics ].
>    - Ensure clicking the Analytics tab renders `ProjectAnalyticsView` seamlessly.
> Ensure strict TypeScript compliance, clean Tailwind dark mode contrast, and natural Australian English copy.

#### Outcome

| | |
|--|--|
| **Files** | `src/components/analytics/ProjectAnalyticsView.tsx`, `src/lib/analytics/task-metrics.ts`, `ProjectDetailView.tsx` (four-tab switcher) |
| **Result** | Multi-view project hub complete: List, Kanban, Gantt, Analytics |

---

### Step 4 — Hardening, RBAC Polish & System Audit

**Date:** Sunday, 30 August 2026  

#### Exact prompt

> Hi Cursor, we are executing the final step of Wave 3: Hardening, RBAC Polish & System Audit (Step 4).
>
> Please perform a final polish pass across our Wave 3 features (`ProjectGanttView.tsx`, `ProjectAnalyticsView.tsx`, and `ProjectDetailView.tsx`):
>
> 1. RBAC Guard Audit:
>    - Verify that Viewers and read-only users cannot trigger edit modals, comment deletions, or task status updates from the Gantt chart, Analytics, or Task Detail surfaces.
>    - Ensure read-only badges and tooltips clearly indicate restricted actions in natural Australian English.
>
> 2. Tab Navigation & State Preservation:
>    - Ensure switching between List View, Kanban Board, Gantt Chart, and Analytics tabs retains active filters and selected task drawer state smoothly without unnecessary re-mount flicker.
>
> 3. Empty State & Loading Resilience:
>    - Verify loading skeleton states render cleanly while server actions fetch project data.
>    - Ensure all charts, timelines, and metric widgets render friendly Australian English fallback messages when a project has zero tasks or incomplete date ranges.
>
> Please run type-checks and verify that `npm run build` and `npm run lint` pass cleanly.

#### Outcome

| | |
|--|--|
| **Files** | `ReadOnlyAccessNotice.tsx`, permission wiring across drawer/Gantt/Kanban; `ProjectTasksSkeleton.tsx` / `app/projects/[id]/loading.tsx` |
| **Result** | Viewers browse safely; write surfaces disabled with clear Australian English notice |

---

### Step 5 — Delete Project / Task (RBAC-enforced)

**Date:** Sunday, 30 August 2026  

#### Exact prompt

> Hi Cursor, please complete the missing Delete functionality for Projects and Tasks across our UI and Server Actions with strict RBAC enforcement:
>
> 1. Task Deletion (`src/components/kanban/TaskDetailDrawer.tsx` & `src/lib/actions/tasks.ts`):
>    - Add a styled "Delete Task" button inside `TaskDetailDrawer.tsx` (guarded by permission check: Super PM, owning PM, or task author).
>    - Add a confirmation modal: "Are you sure you want to delete this task? This action cannot be undone."
>    - Wire it to a `deleteTask(taskId: string)` Server Action that validates RBAC permissions server-side and removes the task along with associated subtasks and comments.
>
> 2. Project Deletion (`src/components/projects/ProjectDetailView.tsx`, project cards, & `src/lib/actions/projects.ts`):
>    - Add a "Delete Project" button/action on the project page header (guarded for Super PM and owning PM only).
>    - Add a confirmation modal: "Are you sure you want to delete this project? All associated tasks, checklists, and comments will be permanently removed."
>    - Wire it to `deleteProject(projectId: string)` Server Action to cascade-delete project records and redirect to `/`.
>
> 3. UI State Refresh:
>    - Ensure deleting a task or project updates the UI state immediately and displays toast notifications in natural Australian English.
>
> Please verify strict TypeScript compliance and clean dark-mode styling.

#### Outcome

| | |
|--|--|
| **Files** | `ConfirmDialog.tsx`, `ToastProvider.tsx`, delete paths in `tasks.ts` / `projects.ts` |
| **Result** | Cascade deletes with confirmation + toast feedback |

---

### Step 6 — Initial Seed Script (`prisma/seed.ts`)

**Date:** Sunday, 30 August 2026  

#### Exact prompt

> Hi Cursor, please create a database reset and seed script file at `prisma/seed.ts` (and a trigger Server Action / CLI helper):
>
> 1. Safe Database Reset (Delete Order):
>    - Wipe existing project data safely in reverse dependency order to prevent foreign key errors:
>      `TaskComment` -> `Subtask` -> `Task` -> `ProjectMember` -> `Project`.
>
> 2. Realistic Seed Data Insertion:
>    - Seed 3 distinct projects (e.g., "Mobile Banking App Refresh", "AI Model Showcase Web", and "Enterprise Cloud Migration").
>    - Populate each project with 8-12 tasks distributed across all Process Groups, statuses, priorities, varied dates (including overdue), checklists, and sample comments.
>
> 3. Execution Setup:
>    - Add a `prisma.seed` configuration in `package.json` so we can run `npx prisma db seed` easily from the Terminal.
>
> Please implement and run this seed script to populate our PostgreSQL Supabase database.

#### Outcome

| | |
|--|--|
| **Files** | `prisma/seed.ts`, `src/lib/seed/database-seed.ts`, `package.json` (`"prisma": { "seed": "npx tsx prisma/seed.ts" }`) |
| **Command** | `npx prisma db seed` |
| **Result** | Repeatable UAT dataset; later rewritten for the Wave 3 UAT seed (Step 8) |

---

### Step 7 — Pre-UAT: Recharts fix + Flexible PIC Assignment

**Date:** Sunday, 30 August 2026 (prompt); verified Monday, 31 August 2026  

#### Exact prompt

> Hi Cursor, please resolve two issues across our codebase before we proceed to Wave 3 UAT:
>
> 1. Fix Recharts Console Warning (`ProjectAnalyticsView.tsx`):
>    - Resolve the warning: "[browser] The width(0) and height(0) of chart should be greater than 0...".
>    - Pass `minWidth={0}` to all `<ResponsiveContainer>` components in `ProjectAnalyticsView.tsx`.
>    - Ensure all outer chart wrapper `<div>` elements explicitly include `w-full min-w-0 min-h-[300px]` CSS classes so Recharts safely measures bounds even inside hidden or flex container tabs.
>
> 2. Flexible PIC Assignment — Registered Users & Custom Text PICs (F-202 / Task Details):
>    - Update `Task` model handling (`prisma/schema.prisma` if needed, `src/lib/types.ts`, and Server Actions) to support an optional `assigneeName` string field alongside `assigneeId`.
>    - In `TaskDetailDrawer.tsx`, upgrade the Assignee field:
>      * Allow PMs/Members to select a registered user from a dropdown OR type a custom un-registered PIC name (e.g. "Mr X").
>      * If a registered user is selected, save both `assigneeId` and `assigneeName`.
>      * If custom text is typed, save `assigneeId: null` and `assigneeName: "Mr X"`.
>    - Update UI Displays (`TaskCard.tsx`, `TaskDetailDrawer.tsx`, `ProjectGanttView.tsx`, `ProjectAnalyticsView.tsx`):
>      * Render the PIC name (`assigneeName`) seamlessly across cards, Gantt rows, and Analytics workload charts.
>      * Display a subtle visual tag for custom text PICs (e.g., a neutral gray initial badge or tooltip "Unregistered PIC") to distinguish them from registered user accounts.
>
> Please run type-checks and verify that `npm run build` passes cleanly.

#### Outcome

| | |
|--|--|
| **Migration** | `prisma/migrations/20260830140000_add_task_assignee_name/` |
| **Files** | `AssigneePicField.tsx`, `PicLabel.tsx`, `src/lib/assignee-display.ts`, analytics/Gantt PIC labels |
| **Charts** | `ResponsiveContainer` gains `minWidth={0}`; wrappers use `w-full min-w-0 min-h-[300px]`; Analytics mounts only when `chartsVisible` (deferred mount while tab is `hidden`) |
| **Command** | `npx prisma migrate dev` (assigneeName) · `npx tsc --noEmit` · `npm run build` |

---

### Step 8 — Wave 3 UAT Seed Rewrite

**Date:** Tuesday, 1 September 2026  

#### Exact prompt

> Hi Cursor, please update our seed script at `prisma/seed.ts` to perform a clean database reset and populate fresh, realistic test data for Wave 3 UAT:
>
> 1. Clean Up Existing Project & Task Data (Safe Cascade Order):
>    - Wipe data in reverse-dependency order: `TaskComment` -> `Subtask` -> `Task` -> `ProjectMember` -> `Project`.
>
> 2. Clean Up Users Except Current Super PM:
>    - Preserve ONLY 1 Super PM account; delete all other existing User records.
>
> 3. Create New Dummy Users (For Future Role Testing):
>    - PM: Alex Morgan (`pm.alex@tracker.local`)
>    - Members: Sarah Jenkins (`member.sarah@tracker.local`), David Chen (`member.david@tracker.local`)
>    - Viewer: Rachel Green (`viewer.rachel@tracker.local`)
>
> 4. Create Small, Highly Realistic Dummy Projects:
>    - Project 1: "E-Commerce Mobile App Redesign" (Owned by Super PM) with Sarah & David as members; 8–10 tasks across all process groups/statuses/priorities; mix of registered PICs, unassigned, and custom PIC "Mr X"; checklists, comments, overdue tasks.
>    - Project 2: "Enterprise Cloud Infrastructure Migration" (Owned by Alex Morgan - PM) with Super PM and Sarah as members; 5–6 tasks.
>
> 5. Execute Seed Script:
>    - Configure and run `npx prisma db seed` against Supabase PostgreSQL.

#### Outcome

| | |
|--|--|
| **Files** | `src/lib/seed/database-seed.ts` rewritten; `prisma/seed.ts` thin CLI entry |
| **Command** | `npx prisma db seed` |
| **Primary UAT project** | **E-Commerce Mobile App Redesign** (used throughout Gantt UAT screenshots) |
| **Auth note** | Seed creates PostgreSQL `User` profiles. Supabase Auth passwords must exist separately for login (e.g. Viewer Rachel password reset for UAT). |

---

### Step 9 — Supabase RLS Hardening (security companion)

**Dates:** Tuesday, 1 September – Wednesday, 2 September 2026  

**Prompt intent:** Explain and remediate Supabase “RLS Disabled in Public” critical advisories without disrupting Prisma/Server Action development.

| | |
|--|--|
| **Migration** | `prisma/migrations/20260901170000_enable_rls_harden_public_schema/` |
| **Docs** | `doc/supabase-security.md` |
| **Approach** | Enable RLS on app tables; app continues to use Prisma with the database role (server-side). Free-tier “leaked password protection” deferred. Unindexed FK warnings reviewed as non-blocking. |

---

### Step 10 — Schema: Initial dates, progress, sortOrder (UAT 1 / UAT 3 / outer-UAT)

**Date:** Saturday, 5 September 2026  

#### Exact prompt (summary of mandatory requirements)

> Apply a comprehensive update to address UAT 1, UAT 3, and outer-UAT revision requirements:
>
> 1. Rename `plannedStartDate` / `plannedDueDate` → `initialStartDate` / `initialDueDate`; add `progress` Int `@default(0)` and `sortOrder` Int `@default(0)`.
> 2. Defaults on create: initial start = today; initial due = today + 7; updated dates mirror initial; progress 0% / 1% / 100% by status.
> 3. Kanban: To Do / Doing / Done labels; "+ Add Task" per column; vertical reorder via `sortOrder`; searchable PIC combobox; optimistic updates.
> 4. Run `npx prisma migrate dev --name rename_planned_to_initial_and_add_progress` and `npx prisma generate`.

#### Outcome

| | |
|--|--|
| **Migration** | `prisma/migrations/20260905120000_rename_planned_to_initial_and_add_progress/` |
| **Files** | `src/lib/task-defaults.ts`, Kanban column Add Task, drawer progress controls, Gantt bar labels (Initial / Updated / Actual) |
| **Commands** | `npx prisma migrate dev --name rename_planned_to_initial_and_add_progress` · `npx prisma generate` |

---

### Step 11 — Progress / status consistency & subsequent Kanban UX

**Dates:** Sunday, 6 September 2026 (multiple prompts)  

Exact follow-up prompts (executed in order):

1. **Progress slider & bidirectional status sync** — local draft buffering; progress ↔ status auto-sync; block future actual dates.
2. **UTC timezone + backward status clearing** — local `format(date, 'yyyy-MM-dd')`; clear `actualStartDate` / `actualCompletionDate` on backward moves.
3. **Top-of-column `sortOrder` on non-drag status moves**; remove flicker (`router.refresh` on field saves); remove redundant header "+ Add Task".

See Section 15 for technical resolutions mapped to UAT Checks.

---

### Step 12 — Gantt iterative fidelity (through Wave 3 close)

**Dates:** Sunday, 6 September – Wednesday, 9 September 2026  

Exact prompt themes (each executed and verified with screenshots):

1. Timeline bounds, padding, Today line percentage math; row/header height sync.
2. Triple bars (Initial / Updated / Actual); open Actual ends at Today; 2D sticky freeze-panes; Today full-line hover tooltip.
3. Portal tooltips; clamp Actual past Today; node at bar end; Week/Month scale; grouping = Task list \| Assignee / PIC.
4. Cursor-following Today tooltip; sticky Today under header (no header overlap); Month column day-proportional offset (`addMonths`, not `addDays(endOfMonth)`).
5. Shared pixel geometry for bars and Today (`getBarPositionPx` / column widths).
6. **Final close-out (9 Sep 2026):** Done Actual checkmark node aligned to bar **right end**; remove red **top circular node** on Today line (line retained).

#### Exact final Gantt prompt

> Hi Cursor, attached is the Gantt Chart appearance at this moment. Please analyse deeply and thoroughly.
>
> 1. For activities that have been done/completed … the nodes and the end of the line should be on the same spot…
> 2. … the node in the top of the [Today] line becomes a distraction. Could you please remove the node?
>
> Ensure `./doc/dev_plan.md` stays aligned with our changes.

#### Outcome

| | |
|--|--|
| **Files** | `ProjectGanttView.tsx`, `src/lib/gantt/date-utils.ts`, `doc/dev_plan.md` (F-204 timeline notes) |
| **Result** | Production-quality Gantt accepted for Wave 3 exit |

---

## 15. Comprehensive UAT & Iterative Bug Resolution Log

Wave 3 UAT was executed against the **live Supabase PostgreSQL** database using the Wave 3 UAT seed (primarily **E-Commerce Mobile App Redesign**). Six official checks were defined; all **passed** after the iterative fixes below.

### 15.1 UAT matrix

| Check | Scenario | Expected behaviour | Result |
|-------|----------|--------------------|--------|
| **1** | **Multi-View Tab Navigation** | Smooth switch between List, Kanban, Gantt, and Analytics; selected task drawer state preserved; no destructive remount flicker | **PASS** |
| **2** | **Cloud Task Comments** | Open drawer → post comment → list refreshes with author + `DD/MM/YYYY, HH:mm`; delete respects RBAC; Viewer cannot post | **PASS** |
| **3** | **Analytics Dashboard** | KPI cards, status donut, PIC workload, process-group bars, overdue panel; empty-state copy; **no** Recharts `width(0)/height(0)` console spam | **PASS** *(after Recharts fix)* |
| **4** | **Flexible PIC + RBAC Surfaces** | Registered member or custom PIC ("Mr X"); Custom badge; Gantt/Analytics show PIC; Viewer read-only notice; seed role users available for boundary checks | **PASS** |
| **5** | **Progress, Status & Date Integrity** | Progress slider usable without focus loss; progress ↔ status sync; local calendar “today”; backward moves clear actual dates; non-drag status moves land at **top** of column (`sortOrder`) | **PASS** *(after iterations)* |
| **6** | **Interactive Gantt Fidelity** | Triple bars aligned to dates; Actual clamped to Today when open; 2D freeze-panes; Week/Month; instant portal tooltips; Today line correct; Done node on bar end; no Today top node | **PASS** *(after iterations)* |

### 15.2 UAT Check 3 — Recharts `width(0) and height(0)`

**Symptom:** Browser console flooded with Recharts warnings when visiting a project (charts measured inside `hidden` tab panels at 0×0).

**Resolution:**

1. Pass `minWidth={0}` on every `<ResponsiveContainer>`.
2. Chart wrappers: `w-full min-w-0 min-h-[300px]`.
3. Deferred mount: `ProjectDetailView` keeps Analytics in the DOM for tab state but passes `chartsVisible={viewMode === "analytics"}` so Recharts only mounts when the Analytics tab is active.

**Files:** `ProjectAnalyticsView.tsx`, `ProjectDetailView.tsx`

### 15.3 UAT Check 5 — UTC timezone date shift

**Symptom:** Setting “today” via `new Date().toISOString().slice(0, 10)` shifted the calendar day backward in WIB (UTC+7) — e.g. evening local time stored as yesterday.

**Resolution:**

- Centralise local calendar dates in `src/lib/task-defaults.ts` using `date-fns` `format(date, "yyyy-MM-dd")`.
- Replace ISO date-slice usage in Server Actions and UI paths that mean “calendar today”.
- Document explicitly: never use UTC ISO date prefix for local calendar fields.

**Files:** `src/lib/task-defaults.ts`, `src/lib/actions/tasks.ts`, drawer/Kanban call sites

### 15.4 UAT Check 5 — Progress slider focus loss

**Symptom:** Typing multi-digit progress (e.g. `50`) lost focus after each keystroke because parent re-renders reset the controlled input.

**Resolution:**

- Buffer progress in local `draftProgress` state inside `TaskDetailDrawer.tsx`.
- Commit to parent / Server Action on blur or intentional commit (same pattern as title/description drafts).
- Slider `<input type="range">` bound to the draft; container `overflow-visible` + padding so the thumb is not clipped; "%" adornment beside the numeric field.

**Files:** `TaskDetailDrawer.tsx`

### 15.5 UAT Check 5 — Backward status transition logic

**Symptom:** Moving a Done task back to Doing/To Do left stale `actualCompletionDate` (and sometimes `actualStartDate`), so Gantt Actual bars and analytics stayed “completed”.

**Resolution (`task-defaults` + Server Actions):**

| New status | Progress | Actual dates |
|------------|----------|--------------|
| **To Do** | `0` | Clear `actualStartDate` **and** `actualCompletionDate` |
| **Doing** | `1` if was 0% or 100% (preserve mid-range otherwise) | Set `actualStartDate` to local today if null; **clear** `actualCompletionDate` |
| **Done** | `100` | Set `actualCompletionDate` to local today; set `actualStartDate` if null |

**Files:** `src/lib/task-defaults.ts`, `src/lib/actions/tasks.ts`

### 15.6 UAT Check 5 — Top-position card placement (`sortOrder`)

**Symptom:** Status changes from the drawer/progress (not vertical DnD) inserted the card mid-column, making moves hard to find.

**Resolution:**

- On non-drag status transitions, assign `sortOrder` **lower than the current minimum** in the destination column so the card appears at the **top**.
- Keep vertical DnD free to set explicit peer ordering.
- Remove route-level `router.refresh()` on field saves to eliminate full-board blink; optimistic local merge only.
- Remove redundant project-header "+ Add Task" (column headers only).

**Files:** `ProjectDetailView.tsx`, `src/lib/actions/tasks.ts`, Kanban components

### 15.7 UAT Check 6 — Gantt freeze-panes, bars, clamps, tooltips

**Symptoms (iterative):** Bars crushed left; Actual extending past Today; Today line wrong on Month scale / scrolling away; tooltips clipped or not cursor-following; Done checkmark left of bar end; Today top red circle distracting.

**Resolutions (final architecture):**

| Topic | Technical approach |
|-------|--------------------|
| **2D freeze-panes** | Sticky date header (`top-0`), sticky task rail (`left-0`), sticky corner (`top-0 left-0` higher z-index); scroll container `overflow-auto` |
| **Triple bars** | Initial (zinc), Updated (sky), Actual (emerald); inclusive end math through end calendar day |
| **Open Actual** | End exclusive at **start of today**; never draw past Today line |
| **Pixel geometry** | Day-proportional `columnWidths`; shared `getTimelineOffsetPx` / `getBarPositionPx` for bars **and** Today |
| **Month scale** | Advance columns with `addMonths` + start-of-day (avoid `addDays(endOfMonth)` retaining `23:59:59`) |
| **Tooltips** | Portal + cursor follow; InstantHoverTip pattern; bar tips for Initial / Updated / Actual |
| **Done node** | Node at bar **right end** (`right-0 translate-x-1/2`) so node X ≡ line end |
| **Today marker** | Full-height red `w-px` line under header; **no** top circular node |

**Files:** `ProjectGanttView.tsx`, `src/lib/gantt/date-utils.ts`, `doc/dev_plan.md` (F-204)

### 15.8 UAT conclusion

**All six Wave 3 verification scenarios passed.** Wave 3 is closed. Version 2.0 North Star features F-201 through F-205 are delivered and UAT-verified (F-206 hosts entry remains optional local setup from Wave 1).

---

## 16. Final Verification & Replication Commands (Wave 3)

Use this recipe after Waves 1–2 are in place (Sections 6 and 12).

### 16.1 Install Wave 3 packages

```bash
cd "/Users/yugoananda/Cursor Project/Simple Project Task Tracker 2.0"
npm install date-fns recharts
npm install -D tsx
```

Confirm `package.json` includes:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

### 16.2 Schema migrations (chronological)

```bash
# Wave 2 baseline (if starting fresh)
npx prisma migrate dev --name init

# Wave 3 — flexible PIC
npx prisma migrate dev --name add_task_assignee_name
# Applied historically as: 20260830140000_add_task_assignee_name

# Wave 3 — RLS hardening (Supabase advisories)
npx prisma migrate dev --name enable_rls_harden_public_schema
# Applied historically as: 20260901170000_enable_rls_harden_public_schema

# Wave 3 — initial dates, progress, sortOrder
npx prisma migrate dev --name rename_planned_to_initial_and_add_progress
# Applied historically as: 20260905120000_rename_planned_to_initial_and_add_progress

npx prisma generate
```

On an existing clone that already contains migration folders, prefer:

```bash
npx prisma migrate deploy
npx prisma generate
```

### 16.3 Database seeding

```bash
npx prisma db seed
# equivalent helper script:
npm run db:seed
```

Expected console summary: Super PM preserved; dummy PM / Members / Viewer profiles; two projects including **E-Commerce Mobile App Redesign**.

### 16.4 Quality gates (run after each Wave 3 milestone)

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run dev
# Open http://localhost:3000 — sign in as Super PM → open E-Commerce project
```

### 16.5 Manual Wave 3 smoke checklist

1. Tabs: List → Kanban → Gantt → Analytics (no Recharts 0×0 warnings).
2. Drawer: post/delete comment; set registered PIC and custom "Mr X".
3. Progress slider: type `50`, drag range; status becomes Doing; no focus loss.
4. Move Done → To Do: actual dates cleared; card at **top** of To Do.
5. Gantt: Week and Month; sticky rail/header; Today line under header without top node; Done Actual node on bar end; hover tooltips for bars and Today.
6. Analytics: KPIs, donut, workload, overdue list.
7. Viewer login (if Auth user configured): read-only notice; no mutations.

### 16.6 Implement Wave 3 code in order

1. `src/lib/actions/comments.ts` + drawer wiring (Step 1).
2. `ProjectGanttView.tsx` + `date-utils.ts` (Step 2; apply Section 15.7 fidelity fixes).
3. `ProjectAnalyticsView.tsx` + `task-metrics.ts` + four-tab hub (Step 3; apply Recharts deferred mount).
4. RBAC polish, skeletons, delete + toasts (Steps 4–5).
5. Seed + `assigneeName` migration + PIC UI (Steps 6–8).
6. RLS migration + `supabase-security.md` (Step 9).
7. Progress / `sortOrder` / initial-date migration + `task-defaults.ts` (Steps 10–11; apply Section 15.3–15.6).
8. Final Gantt close-out (Step 12).
9. Re-run Section 16.4 commands and Section 15.1 UAT matrix.

---

## Appendix D — Wave 3 file inventory

| Path | Role |
|------|------|
| `src/lib/actions/comments.ts` | Comment list / create / delete Server Actions |
| `src/lib/actions/seed.ts` | Optional in-app seed trigger helper |
| `src/lib/gantt/date-utils.ts` | Timeline columns, offsets, bar geometry, Actual range |
| `src/lib/analytics/task-metrics.ts` | Analytics aggregates for F-205 |
| `src/lib/assignee-display.ts` | Shared PIC display helpers |
| `src/lib/task-defaults.ts` | Local today, progress/status/date transition rules |
| `src/lib/permissions.ts` | UI permission helpers |
| `src/lib/seed/database-seed.ts` | Wave 3 UAT reset + seed logic |
| `prisma/seed.ts` | CLI seed entry (`npx prisma db seed`) |
| `src/components/gantt/ProjectGanttView.tsx` | Interactive Gantt (F-204) |
| `src/components/analytics/ProjectAnalyticsView.tsx` | Analytics dashboard (F-205) |
| `src/components/tasks/AssigneePicField.tsx` | Searchable member + custom PIC |
| `src/components/tasks/PicLabel.tsx` | PIC label + Custom badge |
| `src/components/projects/ReadOnlyAccessNotice.tsx` | Viewer / read-only banner |
| `src/components/projects/ProjectTasksSkeleton.tsx` | Loading skeleton |
| `src/components/ui/ConfirmDialog.tsx` | Delete confirmations |
| `src/components/ui/InstantHoverTip.tsx` | Instant tooltips |
| `src/components/providers/ToastProvider.tsx` | Toast notifications |
| `app/projects/[id]/loading.tsx` | Route loading UI |
| `doc/supabase-security.md` | RLS / Supabase advisory notes |
| `prisma/migrations/20260830140000_add_task_assignee_name/` | `assigneeName` |
| `prisma/migrations/20260901170000_enable_rls_harden_public_schema/` | RLS enable |
| `prisma/migrations/20260905120000_rename_planned_to_initial_and_add_progress/` | Initial dates + progress + sortOrder |

---

## Appendix E — Wave completion tracker (final)

| Wave | Focus | Status |
|------|-------|--------|
| **Wave 1** | F-201 Kanban + F-202 Planner drawer (client UI) | **Complete — UAT verified** |
| **Wave 2** | Supabase Auth, PostgreSQL/Prisma, RBAC (F-203) | **Complete — UAT verified** |
| **Wave 3** | Gantt, analytics, cloud comments (F-204, F-205, F-202) | **Complete — UAT verified** |

---

*End of Wave 3 log. Version 2.0 North Star implementation journal is complete through Wave 3 UAT close-out (9 September 2026).*
