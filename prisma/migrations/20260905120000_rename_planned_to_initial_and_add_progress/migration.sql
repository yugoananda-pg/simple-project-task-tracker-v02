-- Rename planned dates → initial dates, add progress + sortOrder.

ALTER TABLE "Task" RENAME COLUMN "plannedStartDate" TO "initialStartDate";
ALTER TABLE "Task" RENAME COLUMN "plannedDueDate" TO "initialDueDate";

ALTER TABLE "Task" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill progress from status
UPDATE "Task" SET "progress" = 0 WHERE "status" = 'todo';
UPDATE "Task" SET "progress" = 1 WHERE "status" = 'in_progress' AND "progress" = 0;
UPDATE "Task" SET "progress" = 100 WHERE "status" = 'done';

-- Backfill sortOrder within each project/status column by createdAt
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "projectId", status
      ORDER BY "createdAt" ASC, id ASC
    ) - 1 AS rn
  FROM "Task"
)
UPDATE "Task" AS t
SET "sortOrder" = ordered.rn
FROM ordered
WHERE t.id = ordered.id;

CREATE INDEX "Task_projectId_status_sortOrder_idx"
  ON "Task"("projectId", "status", "sortOrder");
