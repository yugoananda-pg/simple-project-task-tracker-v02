"use server";

import { revalidatePath } from "next/cache";

import {
  actionFailure,
  actionSuccess,
  ActionError,
  type ActionResult,
} from "@/src/lib/actions/errors";
import { mapTask } from "@/src/lib/mappers";
import { prisma } from "@/src/lib/prisma";
import {
  getProjectAccess,
  requireReadableProject,
  requireSessionUser,
  requireWritableProject,
} from "@/src/lib/rbac";
import type { Task, TaskStatus } from "@/src/lib/types";
import type { Prisma } from "@prisma/client";

const TASK_INCLUDE = {
  subtasks: { orderBy: { sortOrder: "asc" as const } },
  comments: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.TaskInclude;

function validateTaskTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new ActionError("Please enter a task title.", "VALIDATION");
  }
  if (trimmed.length > 200) {
    throw new ActionError("Task title must be 200 characters or fewer.", "VALIDATION");
  }
  return trimmed;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ActionError("Please enter a valid date.", "VALIDATION");
  }
  return parsed;
}

async function requireWritableTask(taskId: string) {
  const user = await requireSessionUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: { select: { userId: true } },
        },
      },
      ...TASK_INCLUDE,
    },
  });

  if (!task) {
    throw new ActionError("Task not found.", "NOT_FOUND");
  }

  const access = getProjectAccess(user, task.project);
  if (access !== "write" && access !== "admin") {
    throw new ActionError("You do not have permission to change this task.", "FORBIDDEN");
  }

  return { user, task };
}

async function requireReadableTask(taskId: string) {
  const user = await requireSessionUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: { select: { userId: true } },
        },
      },
      ...TASK_INCLUDE,
    },
  });

  if (!task) {
    throw new ActionError("Task not found.", "NOT_FOUND");
  }

  const access = getProjectAccess(user, task.project);
  if (access === "none") {
    throw new ActionError("You do not have access to this task.", "FORBIDDEN");
  }

  return { user, task, access };
}

function applyStatusSideEffects(
  status: TaskStatus,
  current: {
    actualStartDate: Date | null;
    actualCompletionDate: Date | null;
  },
): {
  actualStartDate?: Date | null;
  actualCompletionDate?: Date | null;
} {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (status === "in_progress" && !current.actualStartDate) {
    return { actualStartDate: today };
  }
  if (status === "done" && !current.actualCompletionDate) {
    return { actualCompletionDate: today };
  }
  return {};
}

export async function listTasksByProject(
  projectId: string,
): Promise<ActionResult<Task[]>> {
  try {
    await requireReadableProject(projectId);
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: TASK_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });
    return actionSuccess(tasks.map(mapTask));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createTask(input: {
  projectId: string;
  title: string;
  description?: string;
}): Promise<ActionResult<Task>> {
  try {
    await requireWritableProject(input.projectId);
    const title = validateTaskTitle(input.title);
    const description = (input.description ?? "").trim();

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          projectId: input.projectId,
          title,
          description,
        },
        include: TASK_INCLUDE,
      });
      await tx.project.update({
        where: { id: input.projectId },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath("/");
    return actionSuccess(mapTask(task));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateTaskFields(
  taskId: string,
  patch: Partial<Task>,
): Promise<ActionResult<Task>> {
  try {
    const { task } = await requireWritableTask(taskId);

    const data: Prisma.TaskUpdateInput = {};
    if (patch.title !== undefined) data.title = validateTaskTitle(patch.title);
    if (patch.description !== undefined) data.description = patch.description.trim();
    if (patch.status !== undefined) {
      data.status = patch.status;
      Object.assign(
        data,
        applyStatusSideEffects(patch.status, {
          actualStartDate: task.actualStartDate,
          actualCompletionDate: task.actualCompletionDate,
        }),
      );
    }
    if (patch.priority !== undefined) data.priority = patch.priority;
    if (patch.bucket !== undefined) data.bucket = patch.bucket;
    if (patch.assigneeId !== undefined) {
      data.assignee = patch.assigneeId
        ? { connect: { id: patch.assigneeId } }
        : { disconnect: true };
    }
    if (patch.plannedStartDate !== undefined) {
      data.plannedStartDate = parseOptionalDate(patch.plannedStartDate);
    }
    if (patch.plannedDueDate !== undefined) {
      data.plannedDueDate = parseOptionalDate(patch.plannedDueDate);
    }
    if (patch.updatedStartDate !== undefined) {
      data.updatedStartDate = parseOptionalDate(patch.updatedStartDate);
    }
    if (patch.updatedDueDate !== undefined) {
      data.updatedDueDate = parseOptionalDate(patch.updatedDueDate);
    }
    if (patch.actualStartDate !== undefined) {
      data.actualStartDate = parseOptionalDate(patch.actualStartDate);
    }
    if (patch.actualCompletionDate !== undefined) {
      data.actualCompletionDate = parseOptionalDate(patch.actualCompletionDate);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextTask = await tx.task.update({
        where: { id: taskId },
        data,
        include: TASK_INCLUDE,
      });
      await tx.project.update({
        where: { id: task.projectId },
        data: { updatedAt: new Date() },
      });
      return nextTask;
    });

    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath("/");
    return actionSuccess(mapTask(updated));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<ActionResult<Task>> {
  return updateTaskFields(taskId, { status });
}

export async function toggleSubtask(
  taskId: string,
  subtaskId: string,
  isCompleted: boolean,
): Promise<ActionResult<Task>> {
  try {
    const { task } = await requireWritableTask(taskId);
    const subtask = task.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) {
      throw new ActionError("Checklist item not found.", "NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.subtask.update({
        where: { id: subtaskId },
        data: { isCompleted },
      });
      const nextTask = await tx.task.update({
        where: { id: taskId },
        data: { updatedAt: new Date() },
        include: TASK_INCLUDE,
      });
      await tx.project.update({
        where: { id: task.projectId },
        data: { updatedAt: new Date() },
      });
      return nextTask;
    });

    revalidatePath(`/projects/${task.projectId}`);
    return actionSuccess(mapTask(updated));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function addSubtask(
  taskId: string,
  title: string,
): Promise<ActionResult<Task>> {
  try {
    const { task } = await requireWritableTask(taskId);
    const trimmed = title.trim();
    if (!trimmed) {
      throw new ActionError("Please enter a checklist item name first.", "VALIDATION");
    }

    const sortOrder = task.subtasks.length;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.subtask.create({
        data: {
          taskId,
          title: trimmed,
          sortOrder,
        },
      });
      const nextTask = await tx.task.update({
        where: { id: taskId },
        data: { updatedAt: new Date() },
        include: TASK_INCLUDE,
      });
      await tx.project.update({
        where: { id: task.projectId },
        data: { updatedAt: new Date() },
      });
      return nextTask;
    });

    revalidatePath(`/projects/${task.projectId}`);
    return actionSuccess(mapTask(updated));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function addComment(
  taskId: string,
  content: string,
): Promise<ActionResult<Task>> {
  try {
    const { user, task, access } = await requireReadableTask(taskId);
    if (access === "read") {
      throw new ActionError("You do not have permission to post comments.", "FORBIDDEN");
    }

    const trimmed = content.trim();
    if (!trimmed) {
      throw new ActionError("Please enter comment text first.", "VALIDATION");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.taskComment.create({
        data: {
          taskId,
          userId: user.id,
          content: trimmed,
        },
      });
      const nextTask = await tx.task.update({
        where: { id: taskId },
        data: { updatedAt: new Date() },
        include: TASK_INCLUDE,
      });
      await tx.project.update({
        where: { id: task.projectId },
        data: { updatedAt: new Date() },
      });
      return nextTask;
    });

    revalidatePath(`/projects/${task.projectId}`);
    return actionSuccess(mapTask(updated));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteTask(
  taskId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { task, user } = await requireWritableTask(taskId);
    const access = getProjectAccess(user, task.project);
    if (access === "write" && user.globalRole === "member") {
      throw new ActionError("You do not have permission to delete this task.", "FORBIDDEN");
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } });
      await tx.project.update({
        where: { id: task.projectId },
        data: { updatedAt: new Date() },
      });
    });

    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath("/");
    return actionSuccess({ id: taskId });
  } catch (error) {
    return actionFailure(error);
  }
}

export async function getCommentAuthorNames(
  projectId: string,
): Promise<Record<string, string>> {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: {
      comments: {
        select: { userId: true },
      },
    },
  });

  const userIds = [
    ...new Set(tasks.flatMap((task) => task.comments.map((comment) => comment.userId))),
  ];

  if (userIds.length === 0) return {};

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  return Object.fromEntries(users.map((user) => [user.id, user.name]));
}
