"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { X } from "lucide-react";
import type {
  Subtask,
  Task,
  TaskBucket,
  TaskComment,
  TaskPriority,
  TaskStatus,
} from "@/src/lib/types";

export type TaskDetailDrawerProps = {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  /** Live field updates for Planner-style task details. */
  onTaskChange: (taskId: string, patch: Partial<Task>) => void;
  onToggleSubtask?: (
    taskId: string,
    subtaskId: string,
    isCompleted: boolean,
  ) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  /** Wave 3 persistence placeholder — wired for UI now. */
  onPostComment?: (taskId: string, content: string) => void;
  /** Optional display names for comment authors / PIC. */
  userNamesById?: Record<string, string>;
};

const BUCKET_OPTIONS: ReadonlyArray<{ value: TaskBucket; label: string }> = [
  { value: "initiating", label: "Initiating" },
  { value: "planning", label: "Planning" },
  { value: "executing", label: "Executing" },
  { value: "monitoring", label: "Monitoring" },
  { value: "closing", label: "Closing" },
];

const PRIORITY_OPTIONS: ReadonlyArray<{ value: TaskPriority; label: string }> =
  [
    { value: "urgent", label: "Urgent" },
    { value: "important", label: "Important" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

const STATUS_OPTIONS: ReadonlyArray<{ value: TaskStatus; label: string }> = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "Doing" },
  { value: "done", label: "Completed" },
];

type DateFieldKey =
  | "plannedStartDate"
  | "plannedDueDate"
  | "updatedStartDate"
  | "updatedDueDate"
  | "actualStartDate"
  | "actualCompletionDate";

const DATE_FIELDS: ReadonlyArray<{ key: DateFieldKey; label: string }> = [
  { key: "plannedStartDate", label: "Planned start" },
  { key: "plannedDueDate", label: "Planned due" },
  { key: "updatedStartDate", label: "Updated start" },
  { key: "updatedDueDate", label: "Updated due" },
  { key: "actualStartDate", label: "Actual start" },
  { key: "actualCompletionDate", label: "Actual completion" },
];

/** Format an ISO date (or YYYY-MM-DD) as DD/MM/YYYY. */
function formatAuDate(value: string | null | undefined): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** Format an ISO datetime for comment timestamps (Australian English). */
function formatAuDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function fromDateInputValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const fieldClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-500/40";

const labelClassName =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300";

const sectionTitleClassName =
  "text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50";

export default function TaskDetailDrawer({
  task,
  open,
  onClose,
  onTaskChange,
  onToggleSubtask,
  onAddSubtask,
  onPostComment,
  userNamesById = {},
}: TaskDetailDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [draftTaskId, setDraftTaskId] = useState<string | null>(null);

  const activeTask = task;
  const isVisible = open && activeTask !== null;

  if (activeTask && activeTask.id !== draftTaskId) {
    setDraftTaskId(activeTask.id);
    setChecklistDraft("");
    setCommentDraft("");
  }
  if (!activeTask && draftTaskId !== null) {
    setDraftTaskId(null);
    setChecklistDraft("");
    setCommentDraft("");
  }

  useEffect(() => {
    if (!isVisible) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, onClose]);

  const subtasks: Subtask[] = useMemo(() => {
    const items = activeTask?.subtasks ?? [];
    return [...items].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
  }, [activeTask?.subtasks]);

  const comments: TaskComment[] = useMemo(() => {
    const items = activeTask?.comments ?? [];
    return [...items].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [activeTask?.comments]);

  const completedCount = subtasks.filter((item) => item.isCompleted).length;
  const totalCount = subtasks.length;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  function patchTask(patch: Partial<Task>) {
    if (!activeTask) return;
    onTaskChange(activeTask.id, patch);
  }

  function handleAddChecklistItem(event: FormEvent) {
    event.preventDefault();
    if (!activeTask) return;
    const title = checklistDraft.trim();
    if (!title) return;
    onAddSubtask?.(activeTask.id, title);
    setChecklistDraft("");
  }

  function handlePostComment(event: FormEvent) {
    event.preventDefault();
    if (!activeTask) return;
    const content = commentDraft.trim();
    if (!content) return;
    onPostComment?.(activeTask.id, content);
    setCommentDraft("");
  }

  function resolveUserName(userId: string): string {
    return userNamesById[userId] ?? `User · ${userId.slice(0, 8)}`;
  }

  return (
    <div
      className={[
        "fixed inset-0 z-50",
        isVisible ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!isVisible}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close task details"
        tabIndex={isVisible ? 0 : -1}
        onClick={onClose}
        className={[
          "absolute inset-0 bg-zinc-950/55 transition-opacity duration-300 ease-out dark:bg-black/70",
          isVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* Slide-over panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          "absolute inset-y-0 right-0 flex w-full max-w-lg flex-col",
          "border-l border-zinc-200 bg-white shadow-2xl outline-none",
          "dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-black/50",
          "transition-transform duration-300 ease-out",
          "sm:max-w-xl",
          isVisible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {activeTask ? (
          <div key={activeTask.id} className="flex min-h-0 flex-1 flex-col">
            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Task details
                </p>
                <h2
                  id={titleId}
                  className="mt-1 truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                >
                  {activeTask.title || "Untitled task"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
              {/* Title & description */}
              <section className="space-y-4">
                <div>
                  <label
                    htmlFor={`title-${activeTask.id}`}
                    className={labelClassName}
                  >
                    Title
                  </label>
                  <input
                    id={`title-${activeTask.id}`}
                    type="text"
                    value={activeTask.title}
                    onChange={(event) =>
                      patchTask({ title: event.target.value })
                    }
                    className={fieldClassName}
                    placeholder="Task title"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`description-${activeTask.id}`}
                    className={labelClassName}
                  >
                    Description
                  </label>
                  <textarea
                    id={`description-${activeTask.id}`}
                    value={activeTask.description}
                    onChange={(event) =>
                      patchTask({ description: event.target.value })
                    }
                    rows={4}
                    className={`${fieldClassName} resize-y min-h-24`}
                    placeholder="Add a description…"
                  />
                </div>
              </section>

              {/* Planner controls */}
              <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`bucket-${activeTask.id}`}
                    className={labelClassName}
                  >
                    Bucket
                  </label>
                  <select
                    id={`bucket-${activeTask.id}`}
                    value={activeTask.bucket}
                    onChange={(event) =>
                      patchTask({ bucket: event.target.value as TaskBucket })
                    }
                    className={fieldClassName}
                  >
                    {BUCKET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`priority-${activeTask.id}`}
                    className={labelClassName}
                  >
                    Priority
                  </label>
                  <select
                    id={`priority-${activeTask.id}`}
                    value={activeTask.priority}
                    onChange={(event) =>
                      patchTask({
                        priority: event.target.value as TaskPriority,
                      })
                    }
                    className={fieldClassName}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`status-${activeTask.id}`}
                    className={labelClassName}
                  >
                    Status
                  </label>
                  <select
                    id={`status-${activeTask.id}`}
                    value={activeTask.status}
                    onChange={(event) =>
                      patchTask({ status: event.target.value as TaskStatus })
                    }
                    className={fieldClassName}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`assignee-${activeTask.id}`}
                    className={labelClassName}
                  >
                    Assignee (PIC)
                  </label>
                  <input
                    id={`assignee-${activeTask.id}`}
                    type="text"
                    value={activeTask.assigneeId ?? ""}
                    onChange={(event) => {
                      const trimmed = event.target.value.trim();
                      patchTask({
                        assigneeId: trimmed === "" ? null : trimmed,
                      });
                    }}
                    className={fieldClassName}
                    placeholder="User ID or leave blank"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Wave 1 placeholder — enter a user ID until the directory is
                    available.
                  </p>
                </div>
              </section>

              {/* Multi-date grid */}
              <section className="mt-6">
                <h3 className={sectionTitleClassName}>Dates</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Displayed as DD/MM/YYYY (Australian English).
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {DATE_FIELDS.map((field) => {
                    const raw = activeTask[field.key];
                    const inputId = `${field.key}-${activeTask.id}`;
                    return (
                      <div key={field.key}>
                        <label htmlFor={inputId} className={labelClassName}>
                          {field.label}
                        </label>
                        <input
                          id={inputId}
                          type="date"
                          value={toDateInputValue(raw)}
                          onChange={(event) =>
                            patchTask({
                              [field.key]: fromDateInputValue(
                                event.target.value,
                              ),
                            })
                          }
                          className={fieldClassName}
                        />
                        <p className="mt-1 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                          {formatAuDate(raw)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Checklist */}
              <section className="mt-8">
                <div className="flex items-end justify-between gap-3">
                  <h3 className={sectionTitleClassName}>Checklist</h3>
                  <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {totalCount === 0
                      ? "No items yet"
                      : `${completedCount} of ${totalCount} items completed`}
                  </p>
                </div>

                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent}
                  aria-label="Checklist progress"
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300 dark:bg-emerald-400"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <ul className="mt-4 space-y-2">
                  {subtasks.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No checklist items yet. Add one below.
                    </li>
                  ) : (
                    subtasks.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/80"
                      >
                        <input
                          id={`subtask-${item.id}`}
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={(event) =>
                            onToggleSubtask?.(
                              activeTask.id,
                              item.id,
                              event.target.checked,
                            )
                          }
                          className="mt-0.5 size-4 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-500 dark:bg-zinc-950"
                        />
                        <label
                          htmlFor={`subtask-${item.id}`}
                          className={[
                            "min-w-0 flex-1 text-sm leading-snug",
                            item.isCompleted
                              ? "text-zinc-500 line-through dark:text-zinc-500"
                              : "text-zinc-900 dark:text-zinc-100",
                          ].join(" ")}
                        >
                          {item.title}
                        </label>
                      </li>
                    ))
                  )}
                </ul>

                <form
                  onSubmit={handleAddChecklistItem}
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    type="text"
                    value={checklistDraft}
                    onChange={(event) => setChecklistDraft(event.target.value)}
                    className={fieldClassName}
                    placeholder="Add checklist item"
                    aria-label="New checklist item"
                  />
                  <button
                    type="submit"
                    disabled={!checklistDraft.trim() || !onAddSubtask}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                  >
                    Add checklist item
                  </button>
                </form>
              </section>

              {/* Comments — Wave 3 UI placeholder */}
              <section className="mt-8 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={sectionTitleClassName}>Comments</h3>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
                    Wave 3 placeholder
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Conversation UI is ready now; cloud sync arrives in Wave 3.
                </p>

                <ul className="mt-4 space-y-3">
                  {comments.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No comments yet.
                    </li>
                  ) : (
                    comments.map((comment) => (
                      <li
                        key={comment.id}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/80"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                            {resolveUserName(comment.userId)}
                          </p>
                          <time
                            dateTime={comment.createdAt}
                            className="shrink-0 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400"
                          >
                            {formatAuDateTime(comment.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                          {comment.content}
                        </p>
                      </li>
                    ))
                  )}
                </ul>

                <form onSubmit={handlePostComment} className="mt-3 space-y-2">
                  <label
                    htmlFor={`comment-${activeTask.id}`}
                    className={labelClassName}
                  >
                    New comment
                  </label>
                  <textarea
                    id={`comment-${activeTask.id}`}
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    rows={3}
                    className={`${fieldClassName} resize-y`}
                    placeholder="Write a comment…"
                  />
                  <button
                    type="submit"
                    disabled={!commentDraft.trim() || !onPostComment}
                    className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                  >
                    Post comment
                  </button>
                </form>
              </section>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

