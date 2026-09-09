"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { useToast } from "@/src/components/providers/ToastProvider";
import ConfirmDialog from "@/src/components/ui/ConfirmDialog";
import { createProject, deleteProject, type ProjectListItem } from "@/src/lib/actions/projects";

type HomePageClientProps = {
  initialProjects: ProjectListItem[];
  canCreateProject: boolean;
};

export default function HomePageClient({
  initialProjects,
  canCreateProject,
}: HomePageClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [projects, setProjects] = useState(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(
    null,
  );
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isPending, startTransition] = useTransition();

  function openModal() {
    setName("");
    setDescription("");
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (isPending) return;
    setModalOpen(false);
  }

  function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProject({ name, description });
      if (!result.success) {
        setError(result.error);
        return;
      }

      setProjects((current) => [
        {
          ...result.data,
          access: "admin",
          taskCount: 0,
        },
        ...current,
      ]);
      setModalOpen(false);
      router.refresh();
    });
  }

  async function handleDeleteProject() {
    if (!projectToDelete || isDeletingProject) return;

    setIsDeletingProject(true);
    const result = await deleteProject(projectToDelete.id);
    if (!result.success) {
      setIsDeletingProject(false);
      showToast(result.error ?? "Unable to delete this project.", "error");
      return;
    }

    setProjects((current) =>
      current.filter((project) => project.id !== projectToDelete.id),
    );
    setProjectToDelete(null);
    setIsDeletingProject(false);
    showToast("Project deleted successfully.");
    router.refresh();
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Projects
          </h1>
          <p className="mt-2 w-full max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Select a project to switch seamlessly between List and Kanban views,
            and manage detailed task workflows.
          </p>
        </div>

        {canCreateProject ? (
          <button
            type="button"
            onClick={openModal}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            + New Project
          </button>
        ) : null}
      </div>

      <div className="mt-8">
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              No projects yet
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {canCreateProject
                ? "Create your first project to get started."
                : "Projects shared with you will appear here."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-md dark:shadow-black/25 dark:hover:border-zinc-500 dark:hover:bg-zinc-900/95">
                  <Link
                    href={`/projects/${project.id}`}
                    className="block flex-1 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {project.name}
                      </h2>
                      {project.access === "read" ? (
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Read-only
                        </span>
                      ) : null}
                    </div>
                    {project.description ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {project.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm italic text-zinc-400">
                        No description
                      </p>
                    )}
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {project.taskCount === 1
                        ? "1 task"
                        : `${project.taskCount} tasks`}
                    </p>
                  </Link>
                  {project.access === "admin" ? (
                    <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(project)}
                        title="Delete project"
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Delete project
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="presentation"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="new-project-title"
              className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              New project
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Give your project a clear name and optional description.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleCreateProject}>
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Project name
                </label>
                <input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  placeholder="Website redesign"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Description
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isPending}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  placeholder="Optional project summary"
                />
              </div>

              {error ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !name.trim()}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {isPending ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={projectToDelete !== null}
        title="Delete project?"
        message="Are you sure you want to delete this project? All associated tasks, checklists, and comments will be permanently removed."
        confirmLabel="Delete project"
        isPending={isDeletingProject}
        onCancel={() => {
          if (!isDeletingProject) setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
      />
    </section>
  );
}
