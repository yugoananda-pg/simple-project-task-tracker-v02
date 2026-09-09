"use client";

import { Draggable } from "@hello-pangea/dnd";
import PicLabel from "@/src/components/tasks/PicLabel";
import {
  getTaskPicInitial,
  hasAssignedPic,
  isCustomPic,
} from "@/src/lib/assignee-display";
import { getEffectiveDueDate } from "@/src/lib/task-defaults";
import type { Task, TaskBucket, TaskPriority } from "@/src/lib/types";

export type TaskCardProps = {
  task: Task;
  index: number;
  onClick?: (task: Task) => void;
  isDragDisabled?: boolean;
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  important: "Important",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-800 ring-red-600/20",
  important: "bg-orange-100 text-orange-800 ring-orange-600/20",
  medium: "bg-sky-100 text-sky-800 ring-sky-600/20",
  low: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
};

const PROCESS_GROUP_LABELS: Record<TaskBucket, string> = {
  initiating: "Initiating",
  planning: "Planning",
  executing: "Executing",
  monitoring: "Monitoring",
  closing: "Closing",
};

/** Format an ISO date (or YYYY-MM-DD) as DD/MM/YYYY (Australian English). */
function formatAuDate(value: string): string {
  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDateOnly(value: string): Date | null {
  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

function isOverdue(task: Task): boolean {
  if (task.status === "done") return false;
  const dueValue = getEffectiveDueDate(task);
  if (!dueValue) return false;
  const due = parseDateOnly(dueValue);
  if (!due) return false;
  return due < startOfTodayLocal();
}

function hasPic(task: Task): boolean {
  return hasAssignedPic(task);
}

export default function TaskCard({
  task,
  index,
  onClick,
  isDragDisabled = false,
}: TaskCardProps) {
  const overdue = isOverdue(task);

  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={isDragDisabled}
    >
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(isDragDisabled ? {} : provided.dragHandleProps)}
          role="button"
          tabIndex={0}
          onClick={() => onClick?.(task)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClick?.(task);
            }
          }}
          className={[
            "group cursor-grab rounded-lg border bg-white p-3 shadow-sm transition",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900",
            "active:cursor-grabbing",
            snapshot.isDragging
              ? "border-zinc-300 shadow-md ring-2 ring-zinc-900/10"
              : "border-zinc-200 hover:border-zinc-300 hover:shadow-md",
            overdue ? "border-red-300 bg-red-50/80" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug tracking-tight text-zinc-900">
              {task.title}
            </h3>
            {overdue ? (
              <span className="shrink-0 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Overdue
              </span>
            ) : null}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className={[
                "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                PRIORITY_STYLES[task.priority],
              ].join(" ")}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span
              className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800 ring-1 ring-inset ring-violet-600/15"
              title={`Process group: ${PROCESS_GROUP_LABELS[task.bucket]}`}
            >
              {PROCESS_GROUP_LABELS[task.bucket]}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              {hasPic(task) ? (
                <span
                  className={[
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    isCustomPic(task)
                      ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200",
                  ].join(" ")}
                  title={isCustomPic(task) ? "Unregistered PIC" : undefined}
                >
                  {getTaskPicInitial(task)}
                </span>
              ) : null}
              <PicLabel task={task} className="min-w-0 text-xs text-zinc-500" />
            </span>
            <span
              className={[
                "shrink-0 tabular-nums",
                overdue ? "font-medium text-red-700" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {getEffectiveDueDate(task)
                ? formatAuDate(getEffectiveDueDate(task)!)
                : "No due date"}
            </span>
          </div>
        </article>
      )}
    </Draggable>
  );
}
