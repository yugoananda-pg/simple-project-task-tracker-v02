/**
 * Domain types for Simple Project Task Tracker 2.0
 * Canonical models — aligned with doc/dev_plan.md Section 3.
 */

// ---------------------------------------------------------------------------
// Enums / union types
// ---------------------------------------------------------------------------

export type GlobalRole = "super_pm" | "pm" | "member" | "viewer";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskPriority = "urgent" | "important" | "medium" | "low";

export type TaskBucket =
  | "initiating"
  | "planning"
  | "executing"
  | "monitoring"
  | "closing";

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  permittedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  bucket: TaskBucket;
  assigneeId: string | null;
  assigneeName: string;
  initialStartDate: string | null;
  initialDueDate: string | null;
  updatedStartDate: string | null;
  updatedDueDate: string | null;
  actualStartDate: string | null;
  actualCompletionDate: string | null;
  /** Task completion percentage 0–100. */
  progress: number;
  /** Order within a Kanban status column. */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** Optional nested checklist when loaded with relations */
  subtasks?: Subtask[];
  /** Optional nested comments when loaded with relations */
  comments?: TaskComment[];
}
