import "server-only";

import type { GlobalRole } from "@/src/lib/types";
import type { Project, User } from "@prisma/client";

import { ActionError } from "@/src/lib/actions/errors";
import { mapUser } from "@/src/lib/mappers";
import { prisma } from "@/src/lib/prisma";
import { createClient } from "@/src/lib/supabase/server";

export { getRoleLabel } from "@/src/lib/role-labels";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
};

export type ProjectAccessLevel = "none" | "read" | "write" | "admin";

export type ProjectWithMembers = Project & {
  members: Array<{ userId: string }>;
};

export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function requireAuthUserId(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) {
    throw new ActionError("Please sign in to continue.", "UNAUTHORISED");
  }
  return userId;
}

export async function bootstrapUserProfile(input: {
  id: string;
  email: string;
  name: string;
}): Promise<SessionUser> {
  const existing = await prisma.user.findUnique({ where: { id: input.id } });
  if (existing) {
    return mapUser(existing) as SessionUser;
  }

  const userCount = await prisma.user.count();
  const globalRole: GlobalRole = userCount === 0 ? "super_pm" : "member";

  const created = await prisma.user.create({
    data: {
      id: input.id,
      email: input.email,
      name: input.name,
      globalRole,
    },
  });

  return mapUser(created) as SessionUser;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (profile) {
    return mapUser(profile) as SessionUser;
  }

  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";
  const fallbackName = metadataName || user.email.split("@")[0] || "User";

  return bootstrapUserProfile({
    id: user.id,
    email: user.email,
    name: fallbackName,
  });
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new ActionError("Please sign in to continue.", "UNAUTHORISED");
  }
  return user;
}

export function getProjectAccess(
  user: SessionUser,
  project: ProjectWithMembers,
): ProjectAccessLevel {
  if (user.globalRole === "super_pm") {
    return "admin";
  }

  const isOwner = project.ownerId === user.id;
  const isMember = project.members.some((member) => member.userId === user.id);

  if (user.globalRole === "pm") {
    if (isOwner) return "admin";
    if (isMember) return "read";
    return "none";
  }

  if (user.globalRole === "member") {
    return isMember ? "write" : "none";
  }

  if (user.globalRole === "viewer") {
    return isMember ? "read" : "none";
  }

  return "none";
}

export function canCreateProject(user: SessionUser): boolean {
  return user.globalRole === "super_pm" || user.globalRole === "pm";
}

export function assertProjectRead(
  user: SessionUser,
  project: ProjectWithMembers,
): ProjectAccessLevel {
  const access = getProjectAccess(user, project);
  if (access === "none") {
    throw new ActionError("You do not have access to this project.", "FORBIDDEN");
  }
  return access;
}

export function assertProjectWrite(
  user: SessionUser,
  project: ProjectWithMembers,
): ProjectAccessLevel {
  const access = getProjectAccess(user, project);
  if (access !== "write" && access !== "admin") {
    throw new ActionError(
      "You do not have permission to change this project.",
      "FORBIDDEN",
    );
  }
  return access;
}

export function assertProjectAdmin(
  user: SessionUser,
  project: ProjectWithMembers,
): void {
  const access = getProjectAccess(user, project);
  if (access !== "admin") {
    throw new ActionError(
      "You do not have permission to manage this project.",
      "FORBIDDEN",
    );
  }
}

export async function loadProjectWithMembers(
  projectId: string,
): Promise<ProjectWithMembers | null> {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        select: { userId: true },
      },
    },
  });
}

export async function requireReadableProject(
  projectId: string,
): Promise<{ user: SessionUser; project: ProjectWithMembers; access: ProjectAccessLevel }> {
  const user = await requireSessionUser();
  const project = await loadProjectWithMembers(projectId);
  if (!project) {
    throw new ActionError("Project not found.", "NOT_FOUND");
  }
  const access = assertProjectRead(user, project);
  return { user, project, access };
}

export async function requireWritableProject(
  projectId: string,
): Promise<{ user: SessionUser; project: ProjectWithMembers }> {
  const user = await requireSessionUser();
  const project = await loadProjectWithMembers(projectId);
  if (!project) {
    throw new ActionError("Project not found.", "NOT_FOUND");
  }
  assertProjectWrite(user, project);
  return { user, project };
}

export async function requireAdminProject(
  projectId: string,
): Promise<{ user: SessionUser; project: ProjectWithMembers }> {
  const user = await requireSessionUser();
  const project = await loadProjectWithMembers(projectId);
  if (!project) {
    throw new ActionError("Project not found.", "NOT_FOUND");
  }
  assertProjectAdmin(user, project);
  return { user, project };
}

export function projectsVisibilityFilter(user: SessionUser) {
  if (user.globalRole === "super_pm") {
    return {};
  }

  return {
    OR: [
      { ownerId: user.id },
      { members: { some: { userId: user.id } } },
    ],
  };
}
