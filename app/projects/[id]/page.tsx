import ProjectDetailView from "@/src/components/projects/ProjectDetailView";
import { getProjectById } from "@/src/lib/actions/projects";
import { listTasksByProject } from "@/src/lib/actions/tasks";
import { getSessionUser } from "@/src/lib/rbac";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const [projectResult, tasksResult, sessionUser] = await Promise.all([
    getProjectById(id),
    listTasksByProject(id),
    getSessionUser(),
  ]);

  const loadError =
    !projectResult.success
      ? projectResult.error
      : !tasksResult.success
        ? tasksResult.error
        : null;

  return (
    <ProjectDetailView
      projectId={id}
      initialProject={projectResult.success ? projectResult.data.project : null}
      initialTasks={tasksResult.success ? tasksResult.data : []}
      access={projectResult.success ? projectResult.data.access : "none"}
      canWriteTasks={
        projectResult.success ? projectResult.data.canWriteTasks : false
      }
      canManageProject={
        projectResult.success ? projectResult.data.canManage : false
      }
      currentUserId={sessionUser?.id ?? null}
      memberUsers={
        projectResult.success ? projectResult.data.memberUsers : []
      }
      loadError={loadError}
    />
  );
}
