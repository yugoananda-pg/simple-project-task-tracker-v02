"use server";

import { revalidatePath } from "next/cache";

import {
  actionFailure,
  actionSuccess,
  ActionError,
  type ActionResult,
} from "@/src/lib/actions/errors";
import { mapProject } from "@/src/lib/mappers";
import { prisma } from "@/src/lib/prisma";
import {
  canCreateProject,
  getProjectAccess,
  loadProjectWithMembers,
  projectsVisibilityFilter,
  requireAdminProject,
  requireReadableProject,
  requireSessionUser,
  type ProjectAccessLevel,
  type SessionUser,
} from "@/src/lib/rbac";
import type { Project } from "@/src/lib/types";

export type ProjectListItem = Project & {
  access: ProjectAccessLevel;
  taskCount: number;
};

function validateProjectName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ActionError("Please enter a project name.", "VALIDATION");
  }
  if (trimmed.length > 100) {
    throw new ActionError("Project name must be 100 characters or fewer.", "VALIDATION");
  }
  return trimmed;
}

function validateProjectDescription(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length > 500) {
    throw new ActionError(
      "Project description must be 500 characters or fewer.",
      "VALIDATION",
    );
  }
  return trimmed;
}

function withAccess(
  user: SessionUser,
  project: Awaited<ReturnType<typeof loadProjectWithMembers>> & object,
  taskCount = 0,
): ProjectListItem {
  const mapped = mapProject(project);
  return {
    ...mapped,
    access: getProjectAccess(user, project),
    taskCount,
  };
}

export async function listProjects(): Promise<ActionResult<ProjectListItem[]>> {
  try {
    const user = await requireSessionUser();
    const projects = await prisma.project.findMany({
      where: projectsVisibilityFilter(user),
      include: {
        members: { select: { userId: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return actionSuccess(
      projects.map((project) =>
        withAccess(user, project, project._count.tasks),
      ),
    );
  } catch (error) {
    return actionFailure(error);
  }
}

export async function getProjectById(
  projectId: string,
): Promise<
  ActionResult<{
    project: Project;
    access: ProjectAccessLevel;
    canManage: boolean;
    canWriteTasks: boolean;
  }>
> {
  try {
    const { user, project, access } = await requireReadableProject(projectId);
    return actionSuccess({
      project: mapProject(project),
      access,
      canManage: access === "admin",
      canWriteTasks: access === "write" || access === "admin",
    });
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<ActionResult<Project>> {
  try {
    const user = await requireSessionUser();
    if (!canCreateProject(user)) {
      throw new ActionError(
        "You do not have permission to create projects.",
        "FORBIDDEN",
      );
    }

    const name = validateProjectName(input.name);
    const description = validateProjectDescription(input.description ?? "");

    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
          },
        },
      },
      include: {
        members: { select: { userId: true } },
      },
    });

    revalidatePath("/");
    return actionSuccess(mapProject(project));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateProject(input: {
  projectId: string;
  name?: string;
  description?: string;
}): Promise<ActionResult<Project>> {
  try {
    await requireAdminProject(input.projectId);

    const data: { name?: string; description?: string } = {};
    if (input.name !== undefined) {
      data.name = validateProjectName(input.name);
    }
    if (input.description !== undefined) {
      data.description = validateProjectDescription(input.description);
    }

    const project = await prisma.project.update({
      where: { id: input.projectId },
      data,
      include: {
        members: { select: { userId: true } },
      },
    });

    revalidatePath("/");
    revalidatePath(`/projects/${input.projectId}`);
    return actionSuccess(mapProject(project));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteProject(
  projectId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminProject(projectId);
    await prisma.project.delete({ where: { id: projectId } });
    revalidatePath("/");
    return actionSuccess({ id: projectId });
  } catch (error) {
    return actionFailure(error);
  }
}
