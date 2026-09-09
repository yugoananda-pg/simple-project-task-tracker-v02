-- AlterTable
ALTER TABLE "Task" ADD COLUMN "assigneeName" TEXT NOT NULL DEFAULT '';

-- Backfill assignee names from linked user profiles
UPDATE "Task" AS t
SET "assigneeName" = u.name
FROM "User" AS u
WHERE t."assigneeId" = u.id
  AND t."assigneeName" = '';
