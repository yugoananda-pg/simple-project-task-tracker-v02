"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import KanbanBoard from "@/src/components/kanban/KanbanBoard";
import TaskDetailDrawer from "@/src/components/kanban/TaskDetailDrawer";
import TaskListView from "@/src/components/tasks/TaskListView";
import {
  addComment,
  addSubtask,
  createTask,
  getServerStoreSnapshot,
  getStoreSnapshot,
  subscribeStore,
  toggleSubtask,
  updateTaskFields,
  updateTaskStatus,
} from "@/src/lib/store";
import type { Task, TaskStatus } from "@/src/lib/types";

export type ProjectDetailViewProps = {
  projectId: string;
};

type ViewMode = "list" | "kanban";

const VIEW_OPTIONS: ReadonlyArray<{ id: ViewMode; label: string }> = [
  { id: "list", label: "List View" },
  { id: "kanban", label: "Kanban View" },
];

const USER_NAMES: Record<string, string> = {
  "wave1-local-owner": "Local Owner",
};

export default function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const store = useSyncExternalStore(
    subscribeStore,
    getStoreSnapshot,
    getServerStoreSnapshot,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const project = useMemo(
    () => store.projects.find((item) => item.id === projectId) ?? null,
    [store, projectId],
  );

  const tasks = useMemo(
    () => store.tasks.filter((task) => task.projectId === projectId),
    [store, projectId],
  );

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [tasks, selectedTaskId]);

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    try {
      updateTaskStatus(taskId, newStatus);
      setActionError(null);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update task status.",
      );
    }
  }

  function handleTaskChange(taskId: string, patch: Partial<Task>) {
    try {
      updateTaskFields(taskId, patch);
      setActionError(null);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update task.",
      );
    }
  }

  function handleToggleSubtask(
    taskId: string,
    subtaskId: string,
    isCompleted: boolean,
  ) {
    try {
      toggleSubtask(taskId, subtaskId, isCompleted);
      setActionError(null);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update checklist item.",
      );
    }
  }

  function handleAddSubtask(taskId: string, title: string) {
    try {
      addSubtask(taskId, title);
      setActionError(null);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to add checklist item.",
      );
    }
  }

  function handlePostComment(taskId: string, content: string) {
    try {
      addComment(taskId, content);
      setActionError(null);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "Unable to post comment.",
      );
    }
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

  function handleAddTask(event: FormEvent) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    try {
      createTask({ projectId, title });
      setNewTaskTitle("");
      setActionError(null);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "Unable to create task.",
      );
    }
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
            This project does not exist or may have been deleted.
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
          <h1 className="break-words text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {project.description}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-zinc-400">No description</p>
          )}
        </div>

        <form
          onSubmit={handleAddTask}
          className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[20rem] sm:flex-row"
        >
          <input
            type="text"
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            placeholder="New task title"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            aria-label="New task title"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Add task
          </button>
        </form>
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
                onStatusChange={handleStatusChange}
                onTaskClick={openTask}
              />
            ) : (
              <TaskListView
                tasks={tasks}
                onTaskClick={openTask}
                onStatusChange={handleStatusChange}
              />
            )}
          </div>
        </div>
      </div>

      <TaskDetailDrawer
        open={drawerOpen}
        task={selectedTask}
        onClose={closeDrawer}
        onTaskChange={handleTaskChange}
        onToggleSubtask={handleToggleSubtask}
        onAddSubtask={handleAddSubtask}
        onPostComment={handlePostComment}
        userNamesById={USER_NAMES}
      />
    </section>
  );
}
