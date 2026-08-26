"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Task, TaskStatus } from "@/src/lib/types";
import KanbanColumn from "./KanbanColumn";

export type KanbanBoardProps = {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
};

const COLUMNS: ReadonlyArray<{ id: TaskStatus; title: string }> = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "Doing" },
  { id: "done", title: "Completed" },
];

const VALID_STATUSES = new Set<TaskStatus>(["todo", "in_progress", "done"]);

function isTaskStatus(value: string): value is TaskStatus {
  return VALID_STATUSES.has(value as TaskStatus);
}

function subscribeNever() {
  return () => {};
}

/**
 * Interactive Kanban board (F-201).
 * Client-only gate via useSyncExternalStore avoids SSR/hydration mismatches.
 */
export default function KanbanBoard({
  tasks,
  onStatusChange,
  onTaskClick,
}: KanbanBoardProps) {
  const isReady = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const task of tasks) {
      grouped[task.status].push(task);
    }

    return grouped;
  }, [tasks]);

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (!isTaskStatus(destination.droppableId)) return;

    const newStatus = destination.droppableId;
    const previousStatus = source.droppableId;

    if (newStatus === previousStatus) return;

    onStatusChange(draggableId, newStatus);
  }

  if (!isReady) {
    return (
      <div
        className="grid gap-3 md:grid-cols-3"
        aria-busy="true"
        aria-label="Loading Kanban board"
      >
        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className="min-h-[28rem] animate-pulse rounded-xl border border-zinc-200 bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-900/80"
          />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0"
        role="region"
        aria-label="Kanban board"
      >
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={tasksByStatus[column.id]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
