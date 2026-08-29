"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import KanbanBoard from "@/src/components/kanban/KanbanBoard";
import TaskDetailDrawer from "@/src/components/kanban/TaskDetailDrawer";
import TaskListView from "@/src/components/tasks/TaskListView";
import type { ActionResult } from "@/src/lib/actions/errors";
import {
  addComment,
  addSubtask,
  createTask,
  toggleSubtask,
  updateTaskFields,
  updateTaskStatus,
} from "@/src/lib/actions/tasks";
import type { ProjectAccessLevel } from "@/src/lib/rbac";
import type { Project, Task, TaskStatus } from "@/src/lib/types";

export type ProjectDetailViewProps = {
  projectId: string;
  initialProject: Project | null;
  initialTasks: Task[];
  access: ProjectAccessLevel;
  canWriteTasks: boolean;
  userNamesById: Record<string, string>;
  loadError?: string | null;
};

type ViewMode = "list" | "kanban";

const VIEW_OPTIONS: ReadonlyArray<{ id: ViewMode; label: string }> = [
  { id: "list", label: "List View" },
  { id: "kanban", label: "Kanban View" },
];

export default function ProjectDetailView({
  projectId,
  initialProject,
  initialTasks,
  access,
  canWriteTasks,
  userNamesById,
  loadError = null,
}: ProjectDetailViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [syncedInitialTasks, setSyncedInitialTasks] = useState(initialTasks);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [actionError, setActionError] = useState<string | null>(loadError);
  const [isPending, startTransition] = useTransition();

  if (initialTasks !== syncedInitialTasks) {
    setSyncedInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const project = initialProject;
  const selectedTask =
    selectedTaskId != null
      ? (tasks.find((task) => task.id === selectedTaskId) ?? null)
      : null;
  const isReadOnly = access === "read";

  function syncTask(updated: Task) {
    setTasks((current) => {
      const index = current.findIndex((task) => task.id === updated.id);
      if (index < 0) {
        return [updated, ...current];
      }
      const next = [...current];
      next[index] = updated;
      return next;
    });
  }

  function runTaskMutation(
    action: () => Promise<ActionResult<Task>>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setActionError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      syncTask(result.data);
      setActionError(null);
      router.refresh();
    });
  }

  function handleStatusChange(taskId: string, newStatus: TaskStatus): Promise<boolean> {
    if (!canWriteTasks) return Promise.resolve(false);

    const snapshot = tasks;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task,
      ),
    );
    setActionError(null);

    return updateTaskStatus(taskId, newStatus).then((result) => {
      if (!result.success) {
        setTasks(snapshot);
        setActionError(
          result.error ?? "Something went wrong. Please try again.",
        );
        return false;
      }
      syncTask(result.data);
      router.refresh();
      return true;
    });
  }

  function handleTaskChange(taskId: string, patch: Partial<Task>) {
    if (!canWriteTasks) return;
    runTaskMutation(() => updateTaskFields(taskId, patch));
  }

  function handleToggleSubtask(
    taskId: string,
    subtaskId: string,
    isCompleted: boolean,
  ) {
    if (!canWriteTasks) return;
    runTaskMutation(() => toggleSubtask(taskId, subtaskId, isCompleted));
  }

  function handleAddSubtask(taskId: string, title: string) {
    if (!canWriteTasks) return;
    runTaskMutation(() => addSubtask(taskId, title));
  }

  function handlePostComment(taskId: string, content: string) {
    if (!canWriteTasks) return;
    runTaskMutation(() => addComment(taskId, content));
  }

  function openTask(task: Task) {
    setSelectedTaskId(task.id);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    window.setTimeout(() => {
      setSelectedTaskId(null);
    }, 300);
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWriteTasks) return;

    const title = newTaskTitle.trim();
    if (!title) return;

    startTransition(async () => {
      const result = await createTask({ projectId, title });
      if (!result.success) {
        setActionError(result.error ?? "Unable to create task.");
        return;
      }
      syncTask(result.data);
      setNewTaskTitle("");
      setActionError(null);
      router.refresh();
    });
  }

  if (!project) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to projects
        </Link>
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Project not found
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This project does not exist or you do not have access to it.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to projects
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {project.name}
            </h1>
            {isReadOnly ? (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Read-only
              </span>
            ) : null}
          </div>
          {project.description ? (
            <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {project.description}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-zinc-400">No description</p>
          )}
        </div>

        {canWriteTasks ? (
          <form
            onSubmit={handleAddTask}
            className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[20rem] sm:flex-row"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="New task title"
              disabled={isPending}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/40 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
              aria-label="New task title"
            />
            <span className="group relative inline-flex">
              <button
                type="submit"
                disabled={!newTaskTitle.trim() || isPending}
                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
              >
                Add task
              </button>
              {!newTaskTitle.trim() ? (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[16rem] -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 invisible shadow-lg transition-none duration-0 group-hover:visible group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-950"
                >
                  Please enter a task title first
                </span>
              ) : null}
            </span>
          </form>
        ) : null}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Tasks
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {tasks.length === 1 ? "1 task" : `${tasks.length} tasks`}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Task view switcher"
            className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {VIEW_OPTIONS.map((option) => {
              const isActive = viewMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setViewMode(option.id)}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                    isActive
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {actionError ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
            {actionError}
          </div>
        ) : null}

        <div className="relative min-h-[28rem]">
          <div key={viewMode} className="sptt-view-fade">
            {viewMode === "kanban" ? (
              <KanbanBoard
                tasks={tasks}
                onStatusChange={canWriteTasks ? handleStatusChange : undefined}
                onTaskClick={openTask}
                readOnly={!canWriteTasks}
              />
            ) : (
              <TaskListView
                tasks={tasks}
                onTaskClick={openTask}
                onStatusChange={canWriteTasks ? handleStatusChange : undefined}
              />
            )}
          </div>
        </div>
      </div>

      <TaskDetailDrawer
        open={drawerOpen}
        task={selectedTask}
        onClose={closeDrawer}
        onTaskChange={canWriteTasks ? handleTaskChange : undefined}
        onToggleSubtask={canWriteTasks ? handleToggleSubtask : undefined}
        onAddSubtask={canWriteTasks ? handleAddSubtask : undefined}
        onPostComment={canWriteTasks ? handlePostComment : undefined}
        userNamesById={userNamesById}
        readOnly={!canWriteTasks}
      />
    </section>
  );
}
