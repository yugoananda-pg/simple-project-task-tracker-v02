import ProjectDetailView from "@/src/components/projects/ProjectDetailView";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} />;
}
