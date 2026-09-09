"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import KanbanBoard from "@/src/components/kanban/KanbanBoard";
import TaskDetailDrawer from "@/src/components/kanban/TaskDetailDrawer";
import ProjectAnalyticsView from "@/src/components/analytics/ProjectAnalyticsView";
import ProjectGanttView from "@/src/components/gantt/ProjectGanttView";
import ReadOnlyAccessNotice from "@/src/components/projects/ReadOnlyAccessNotice";
import TaskListView from "@/src/components/tasks/TaskListView";
import ConfirmDialog from "@/src/components/ui/ConfirmDialog";
import { useToast } from "@/src/components/providers/ToastProvider";
import type { ActionResult } from "@/src/lib/actions/errors";
import { deleteProject } from "@/src/lib/actions/projects";
import {
  addSubtask,
  createTask,
  deleteTask,
  reorderTasks,
  toggleSubtask,
  updateTaskFields,
  updateTaskStatus,
} from "@/src/lib/actions/tasks";
import { canDeleteTaskUi } from "@/src/lib/permissions";
import type { ProjectMemberUser } from "@/src/lib/actions/projects";
import type { ProjectAccessLevel } from "@/src/lib/rbac";
import { buildProgressStatusPatch } from "@/src/lib/task-defaults";
import type { Project, Task, TaskStatus } from "@/src/lib/types";
import { Loader2 } from "lucide-react";

export type ProjectDetailViewProps = {
  projectId: string;
  initialProject: Project | null;
  initialTasks: Task[];
  access: ProjectAccessLevel;
  canWriteTasks: boolean;
  canManageProject: boolean;
  currentUserId: string | null;
  memberUsers: ProjectMemberUser[];
  loadError?: string | null;
};

type ViewMode = "list" | "kanban" | "gantt" | "analytics";

const VIEW_OPTIONS: ReadonlyArray<{ id: ViewMode; label: string }> = [
  { id: "list", label: "List View" },
  { id: "kanban", label: "Kanban Board" },
  { id: "gantt", label: "Gantt Chart" },
  { id: "analytics", label: "Analytics" },
];

/** Place a task above every card currently in the destination column. */
function sortOrderAtTopOfColumn(
  tasks: Task[],
  status: TaskStatus,
  excludeTaskId?: string,
): number {
  let min: number | null = null;
  for (const task of tasks) {
    if (task.status !== status) continue;
    if (excludeTaskId && task.id === excludeTaskId) continue;
    if (min == null || task.sortOrder < min) min = task.sortOrder;
  }
  return min == null ? 0 : min - 1;
}

export default function ProjectDetailView({
  projectId,
  initialProject,
  initialTasks,
  access,
  canWriteTasks,
  canManageProject,
  currentUserId,
  memberUsers,
  loadError = null,
}: ProjectDetailViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [syncedInitialTasks, setSyncedInitialTasks] = useState(initialTasks);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(loadError);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isCreatingTask, startCreateTransition] = useTransition();

  // Only adopt server tasks when the server payload identity changes (navigation /
  // intentional refresh). Do not stomp optimistic local edits mid-session.
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
  const canDeleteSelectedTask = canDeleteTaskUi(
    canManageProject,
    currentUserId,
    selectedTask,
  );

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

  /** Silent optimistic mutation — no route refresh, no board overlay. */
  function runTaskMutation(
    action: () => Promise<ActionResult<Task>>,
    optimisticPatch?: { taskId: string; patch: Partial<Task> },
  ) {
    const snapshot = tasks;
    if (optimisticPatch) {
      setTasks((current) =>
        current.map((task) =>
          task.id === optimisticPatch.taskId
            ? { ...task, ...optimisticPatch.patch }
            : task,
        ),
      );
    }

    void action().then((result) => {
      if (!result.success) {
        if (optimisticPatch) setTasks(snapshot);
        setActionError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      syncTask(result.data);
      setActionError(null);
    });
  }

  function applyLocalStatusChange(
    task: Task,
    newStatus: TaskStatus,
    options?: { pinToTop?: boolean; allTasks?: Task[] },
  ): Task {
    const patched = buildProgressStatusPatch(task, { status: newStatus });
    const sortOrder =
      options?.pinToTop &&
      options.allTasks &&
      newStatus !== task.status
        ? sortOrderAtTopOfColumn(options.allTasks, newStatus, task.id)
        : task.sortOrder;
    return { ...task, ...patched, sortOrder };
  }

  function handleStatusChange(taskId: string, newStatus: TaskStatus): Promise<boolean> {
    if (!canWriteTasks) return Promise.resolve(false);

    const snapshot = tasks;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? applyLocalStatusChange(task, newStatus, {
              pinToTop: true,
              allTasks: current,
            })
          : task,
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
      return true;
    });
  }

  function handleReorder(input: {
    taskId: string;
    sourceStatus: TaskStatus;
    destinationStatus: TaskStatus;
    sourceIndex: number;
    destinationIndex: number;
  }) {
    if (!canWriteTasks) return;

    const snapshot = tasks;
    const nextTasks = [...tasks];
    const columnTasks = nextTasks
      .filter((task) => task.status === input.sourceStatus)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const [moved] = columnTasks.splice(input.sourceIndex, 1);
    if (!moved) return;

    if (input.sourceStatus === input.destinationStatus) {
      columnTasks.splice(input.destinationIndex, 0, moved);
      const reordered = columnTasks.map((task, index) => ({
        ...task,
        sortOrder: index,
      }));
      const others = nextTasks.filter((task) => task.status !== input.sourceStatus);
      setTasks([...others, ...reordered]);
      setActionError(null);

      void reorderTasks({
        projectId,
        status: input.destinationStatus,
        orderedTaskIds: reordered.map((task) => task.id),
      }).then((result) => {
        if (!result.success) {
          setTasks(snapshot);
          setActionError(result.error ?? "Unable to reorder tasks.");
        }
      });
      return;
    }

    const destColumn = nextTasks
      .filter((task) => task.status === input.destinationStatus)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    // DnD keeps the drop index — do not force top-of-column.
    const movedTask = applyLocalStatusChange(moved, input.destinationStatus);
    destColumn.splice(input.destinationIndex, 0, movedTask);

    const sourceReordered = columnTasks.map((task, index) => ({
      ...task,
      sortOrder: index,
    }));
    const destReordered = destColumn.map((task, index) => ({
      ...task,
      sortOrder: index,
    }));
    const others = nextTasks.filter(
      (task) =>
        task.status !== input.sourceStatus &&
        task.status !== input.destinationStatus,
    );
    setTasks([...others, ...sourceReordered, ...destReordered]);
    setActionError(null);

    void Promise.all([
      reorderTasks({
        projectId,
        status: input.sourceStatus,
        orderedTaskIds: sourceReordered.map((task) => task.id),
      }),
      reorderTasks({
        projectId,
        status: input.destinationStatus,
        orderedTaskIds: destReordered.map((task) => task.id),
      }),
    ]).then(([sourceResult, destResult]) => {
      if (!sourceResult.success || !destResult.success) {
        setTasks(snapshot);
        const message = !sourceResult.success
          ? sourceResult.error
          : !destResult.success
            ? destResult.error
            : null;
        setActionError(message ?? "Unable to move and reorder tasks.");
      }
    });
  }

  function handleTaskChange(taskId: string, patch: Partial<Task>) {
    if (!canWriteTasks) return;
    const current = tasks.find((task) => task.id === taskId);
    if (!current) return;

    const synced = buildProgressStatusPatch(current, patch);
    const nextStatus = synced.status ?? current.status;
    const statusChanged = nextStatus !== current.status;
    const optimistic: Partial<Task> = statusChanged
      ? {
          ...synced,
          sortOrder: sortOrderAtTopOfColumn(tasks, nextStatus, taskId),
        }
      : synced;

    runTaskMutation(() => updateTaskFields(taskId, optimistic), {
      taskId,
      patch: optimistic,
    });
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

  async function handleAddTaskInColumn(status: TaskStatus) {
    if (!canWriteTasks) return;

    startCreateTransition(async () => {
      const result = await createTask({
        projectId,
        title: "New task",
        status,
      });
      if (!result.success) {
        setActionError(result.error ?? "Unable to create task.");
        return;
      }
      syncTask(result.data);
      setSelectedTaskId(result.data.id);
      setDrawerOpen(true);
      setActionError(null);
    });
  }

  async function handleDeleteTask(taskId: string) {
    if (
      !canDeleteTaskUi(canManageProject, currentUserId, selectedTask) ||
      isDeletingTask
    ) {
      return;
    }

    setIsDeletingTask(true);
    setActionError(null);

    const result = await deleteTask(taskId);
    if (!result.success) {
      setIsDeletingTask(false);
      setActionError(result.error ?? "Unable to delete this task.");
      showToast(result.error ?? "Unable to delete this task.", "error");
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== taskId));
    setIsDeletingTask(false);
    closeDrawer();
    showToast("Task deleted successfully.");
  }

  async function handleDeleteProject() {
    if (!canManageProject || isDeletingProject) return;

    setIsDeletingProject(true);
    setActionError(null);

    const result = await deleteProject(projectId);
    if (!result.success) {
      setIsDeletingProject(false);
      setActionError(result.error ?? "Unable to delete this project.");
      showToast(result.error ?? "Unable to delete this project.", "error");
      return;
    }

    showToast("Project deleted successfully.");
    router.push("/");
    router.refresh();
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

      <div className="mt-4 flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
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
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-400 md:text-base">
              {project.description}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-zinc-400">No description</p>
          )}
        </div>

        {canManageProject ? (
          <button
            type="button"
            onClick={() => setDeleteProjectDialogOpen(true)}
            disabled={isDeletingProject}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
          >
            Delete project
          </button>
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

        {isReadOnly ? <ReadOnlyAccessNotice /> : null}

        <div className="relative min-h-[28rem]">
          {isCreatingTask ? (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/55 backdrop-blur-[1px] dark:bg-zinc-950/50"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Creating task…
              </div>
            </div>
          ) : null}

          <div
            role="tabpanel"
            aria-hidden={viewMode !== "kanban"}
            className={viewMode === "kanban" ? "block" : "hidden"}
          >
            <KanbanBoard
              tasks={tasks}
              onStatusChange={canWriteTasks ? handleStatusChange : undefined}
              onReorder={canWriteTasks ? handleReorder : undefined}
              onTaskClick={openTask}
              onAddTask={canWriteTasks ? handleAddTaskInColumn : undefined}
              readOnly={!canWriteTasks}
            />
          </div>

          <div
            role="tabpanel"
            aria-hidden={viewMode !== "list"}
            className={viewMode === "list" ? "block" : "hidden"}
          >
            <TaskListView
              tasks={tasks}
              onTaskClick={openTask}
              onStatusChange={canWriteTasks ? handleStatusChange : undefined}
            />
          </div>

          <div
            role="tabpanel"
            aria-hidden={viewMode !== "gantt"}
            className={viewMode === "gantt" ? "block" : "hidden"}
          >
            <ProjectGanttView
              tasks={tasks}
              projectName={project.name}
              onTaskClick={openTask}
              readOnly={isReadOnly}
            />
          </div>

          <div
            role="tabpanel"
            aria-hidden={viewMode !== "analytics"}
            className={viewMode === "analytics" ? "block" : "hidden"}
          >
            <ProjectAnalyticsView
              tasks={tasks}
              onTaskClick={openTask}
              readOnly={isReadOnly}
              chartsVisible={viewMode === "analytics"}
            />
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
        readOnly={!canWriteTasks}
        canDeleteTask={canDeleteSelectedTask}
        onDeleteTask={canDeleteSelectedTask ? handleDeleteTask : undefined}
        isDeletePending={isDeletingTask}
        memberUsers={memberUsers}
      />

      <ConfirmDialog
        open={deleteProjectDialogOpen}
        title="Delete project?"
        message="Are you sure you want to delete this project? All associated tasks, checklists, and comments will be permanently removed."
        confirmLabel="Delete project"
        isPending={isDeletingProject}
        onCancel={() => {
          if (!isDeletingProject) setDeleteProjectDialogOpen(false);
        }}
        onConfirm={handleDeleteProject}
      />
    </section>
  );
}
