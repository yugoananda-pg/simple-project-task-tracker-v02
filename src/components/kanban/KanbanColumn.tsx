"use client";

import { Droppable } from "@hello-pangea/dnd";
import type { Task, TaskStatus } from "@/src/lib/types";
import TaskCard from "./TaskCard";

export type KanbanColumnProps = {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
};

export default function KanbanColumn({
  id,
  title,
  tasks,
  onTaskClick,
}: KanbanColumnProps) {
  return (
    <section className="flex min-h-[28rem] w-full min-w-[16.5rem] flex-1 flex-col rounded-xl border border-zinc-200 bg-zinc-50/80">
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-3 sm:px-4">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          {title}
        </h2>
        <span
          className="inline-flex min-w-6 items-center justify-center rounded-full bg-zinc-200/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-700"
          aria-label={`${tasks.length} tasks`}
        >
          {tasks.length}
        </span>
      </header>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={[
              "flex flex-1 flex-col gap-2.5 p-2.5 sm:p-3",
              "transition-colors",
              snapshot.isDraggingOver ? "bg-sky-50/70" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {tasks.length === 0 ? (
              <div
                className={[
                  "flex flex-1 items-center justify-center rounded-lg border border-dashed px-3 py-8 text-center text-xs",
                  snapshot.isDraggingOver
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-zinc-300 text-zinc-400",
                ].join(" ")}
              >
                {snapshot.isDraggingOver
                  ? "Drop task here"
                  : "No tasks in this column"}
              </div>
            ) : (
              tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onClick={onTaskClick}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  );
}
