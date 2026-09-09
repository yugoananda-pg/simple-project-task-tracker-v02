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

export type ProjectMemberUser = {
  id: string;
  name: string;
  email: string;
};

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
    memberUsers: ProjectMemberUser[];
  }>
> {
  try {
    const { project, access } = await requireReadableProject(projectId);
    const memberRows = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    });
    return actionSuccess({
      project: mapProject(project),
      access,
      canManage: access === "admin",
      canWriteTasks: access === "write" || access === "admin",
      memberUsers: memberRows.map((row) => row.user),
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

export async function deleteProject(
  projectId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminProject(projectId);
    await prisma.project.delete({ where: { id: projectId } });
    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    return actionSuccess({ id: projectId });
  } catch (error) {
    return actionFailure(error);
  }
}
