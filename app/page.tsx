import HomePageClient from "@/src/components/projects/HomePageClient";
import { listProjects } from "@/src/lib/actions/projects";
import { canCreateProject, getSessionUser } from "@/src/lib/rbac";

export default async function HomePage() {
  const user = await getSessionUser();
  const result = await listProjects();
  const projects = result.success ? result.data : [];

  return (
    <HomePageClient
      initialProjects={projects}
      canCreateProject={user ? canCreateProject(user) : false}
    />
  );
}
