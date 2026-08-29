import ProjectDetailView from "@/src/components/projects/ProjectDetailView";
import { getProjectById } from "@/src/lib/actions/projects";
import { getCommentAuthorNames, listTasksByProject } from "@/src/lib/actions/tasks";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const [projectResult, tasksResult, userNamesById] = await Promise.all([
    getProjectById(id),
    listTasksByProject(id),
    getCommentAuthorNames(id).catch(() => ({})),
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
      userNamesById={userNamesById}
      loadError={loadError}
    />
  );
}
