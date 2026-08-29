# Simple Project Task Tracker 2.0 — Development Process & Execution Log

**Document:** `dev_proc.md`  
**Product:** Simple Project Task Tracker 2.0  
**Language:** Australian English  
**Companion blueprint:** [`./doc/dev_plan.md`](./dev_plan.md)  
**Repository:** `https://github.com/yugoananda-pg/simple-project-task-tracker-v02.git`  
**Last updated:** 29 August 2026  

---

## 1. Executive Summary & Process Intent

This document is the **living engineering journal** and **step-by-step replication manual** for Simple Project Task Tracker 2.0. It records everything required to recreate the product state achieved at the end of each Wave — not only *what* was built, but *how* it was built.

`dev_proc.md` captures:

- Environment preparation and Terminal commands (including steps run manually on macOS before or outside AI sessions)
- AI prompts (or prompt intent) used to drive implementation
- Files created or modified, and the architectural outcome of each step
- User Acceptance Testing (UAT) scenarios, results, feedback, and post-UAT refinements
- A concise replication recipe so any human engineer or future AI collaborator can rebuild the same product state

**Scope of this edition:** Wave 1 and Wave 2 are **100% complete and UAT-verified** against the live Supabase PostgreSQL database. Wave 3 (Gantt, analytics, cloud-synced comments) remains defined in `dev_plan.md` and will be appended here when that Wave closes.

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
| **Wave 3** | Gantt, analytics, cloud comments (F-204, F-205, F-202 comments) | Not started |

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

*End of Wave 2 log. Wave 3 entries will be appended below this line without rewriting completed history.*
