import type { Task } from "@/src/lib/types";

export type TaskPicInfo = Pick<Task, "assigneeId" | "assigneeName">;

export function getTaskPicDisplayName(task: TaskPicInfo): string {
  const name = task.assigneeName?.trim();
  if (name) return name;
  if (task.assigneeId) return `PIC · ${task.assigneeId.slice(0, 8)}`;
  return "Unassigned";
}

/** Custom (unregistered) PIC — name stored without a linked user account. */
export function isCustomPic(task: TaskPicInfo): boolean {
  return !task.assigneeId && Boolean(task.assigneeName?.trim());
}

export function hasAssignedPic(task: TaskPicInfo): boolean {
  return Boolean(task.assigneeId || task.assigneeName?.trim());
}

/** Stable key for analytics / Gantt grouping. */
export function getTaskPicKey(task: TaskPicInfo): string {
  if (task.assigneeId) return `user:${task.assigneeId}`;
  const name = task.assigneeName?.trim();
  if (name) return `custom:${name.toLowerCase()}`;
  return "__unassigned__";
}

export function getTaskPicInitial(task: TaskPicInfo): string {
  const label = getTaskPicDisplayName(task);
  return (label.trim()[0] ?? "?").toUpperCase();
}
