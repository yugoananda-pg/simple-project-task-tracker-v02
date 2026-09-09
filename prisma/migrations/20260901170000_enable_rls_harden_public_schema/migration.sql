-- Harden public schema: enable RLS and block direct PostgREST access.
-- Prisma connects as the postgres role (migrations/runtime), which bypasses RLS.
-- The app enforces RBAC in Server Actions — not via Supabase Data API policies.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subtask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "User" FROM anon, authenticated;
REVOKE ALL ON TABLE "Project" FROM anon, authenticated;
REVOKE ALL ON TABLE "ProjectMember" FROM anon, authenticated;
REVOKE ALL ON TABLE "Task" FROM anon, authenticated;
REVOKE ALL ON TABLE "Subtask" FROM anon, authenticated;
REVOKE ALL ON TABLE "TaskComment" FROM anon, authenticated;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;

-- Index unused by current Prisma query patterns (tasks loaded by projectId).
DROP INDEX IF EXISTS "Task_assigneeId_idx";
