import type { Task } from "@/src/lib/types";

/** Client-side mirror of server task delete rules (admin or assigned PIC). */
export function canDeleteTaskUi(
  canManageProject: boolean,
  currentUserId: string | null | undefined,
  task: Pick<Task, "assigneeId"> | null | undefined,
): boolean {
  if (!task || !currentUserId) return false;
  if (canManageProject) return true;
  return task.assigneeId === currentUserId;
}
