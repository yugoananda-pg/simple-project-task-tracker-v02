"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
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

/** Format an ISO date (or YYYY-MM-DD) as DD/MM/YYYY without timezone shifts. */
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

/** Keep only a calendar YYYY-MM-DD string for native date inputs. */
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : "";
}

const fieldClassName =
  "box-border w-full min-w-0 max-w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-500/40";

const labelClassName =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300";

const sectionTitleClassName =
  "text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50";

const sectionClassName = "w-full min-w-0 max-w-full";

const primaryButtonClassName =
  "inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white";

/**
 * Instant CSS tooltip for disabled primary actions.
 * Avoids the browser's delayed native `title` tooltip.
 */
function InstantTooltipButton({
  disabled,
  tooltip,
  type = "submit",
  className,
  children,
}: {
  disabled: boolean;
  tooltip: string;
  type?: "button" | "submit" | "reset";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex w-full max-w-full shrink-0 sm:w-auto">
      <button
        type={type}
        disabled={disabled}
        className={className}
        aria-disabled={disabled}
      >
        {children}
      </button>
      {disabled ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 invisible shadow-lg transition-none duration-0 group-hover:visible group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-950"
        >
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Native HTML5 date picker — uncontrolled while editing so keyboard
 * entry of day/month/year is not clobbered by React re-renders.
 * Parent state syncs only on blur.
 */
function AuDateField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: string | null;
  onCommit: (next: string | null) => void;
}) {
  const externalValue = toDateInputValue(value);
  const [caption, setCaption] = useState(externalValue);
  const [syncedExternal, setSyncedExternal] = useState(externalValue);
  /** Extra remount token when an invalid edit must be discarded. */
  const [epoch, setEpoch] = useState(0);

  if (syncedExternal !== externalValue) {
    setSyncedExternal(externalValue);
    setCaption(externalValue);
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <input
        key={`${id}-${externalValue}-${epoch}`}
        id={id}
        type="date"
        lang="en-AU"
        defaultValue={externalValue}
        onBlur={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            setCaption("");
            onCommit(null);
            return;
          }
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            setCaption(raw);
            onCommit(raw);
            return;
          }
          // Incomplete edit — remount to restore the last saved value.
          setCaption(externalValue);
          setEpoch((n) => n + 1);
        }}
        className={`${fieldClassName} [color-scheme:light] dark:[color-scheme:dark]`}
      />
      <p className="mt-1 break-words text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
        {caption ? formatAuDate(caption) : "—"}{" "}
        <span className="text-zinc-400 dark:text-zinc-500">(DD/MM/YYYY)</span>
      </p>
    </div>
  );
}
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
          "absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-x-hidden",
          "border-l border-zinc-200 bg-white shadow-2xl outline-none",
          "dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-black/50",
          "transition-transform duration-300 ease-out",
          "sm:max-w-xl",
          isVisible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {activeTask ? (
          <div
            key={activeTask.id}
            className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col"
          >
            <header className="flex w-full min-w-0 max-w-full items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-5">
              <div className="min-w-0 flex-1">
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

            <div className="min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
              {/* Title & description */}
              <section className={`${sectionClassName} space-y-4`}>
                <div className="w-full min-w-0 max-w-full">
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

                <div className="w-full min-w-0 max-w-full">
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
                    className={`${fieldClassName} min-h-24 resize-y`}
                    placeholder="Add a description…"
                  />
                </div>
              </section>

              {/* Planner controls */}
              <section
                className={`${sectionClassName} mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2`}
              >
                <div className="w-full min-w-0 max-w-full">
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

                <div className="w-full min-w-0 max-w-full">
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

                <div className="w-full min-w-0 max-w-full">
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

                <div className="w-full min-w-0 max-w-full">
                  <label
                    htmlFor={`assignee-${activeTask.id}`}
                    className={labelClassName}
                  >
                    Assignee (PIC)
                  </label>
                  <input
                    id={`assignee-${activeTask.id}`}
                    type="text"
                    defaultValue={activeTask.assigneeId ?? ""}
                    onBlur={(event) => {
                      const trimmed = event.target.value.trim();
                      patchTask({
                        assigneeId: trimmed === "" ? null : trimmed,
                      });
                    }}
                    className={fieldClassName}
                    placeholder="User ID or leave blank"
                    autoComplete="off"
                  />
                  <p className="mt-1 break-words text-[11px] text-zinc-500 dark:text-zinc-400">
                    Wave 1 placeholder — enter a user ID until the directory is
                    available.
                  </p>
                </div>
              </section>

              {/* Multi-date grid */}
              <section className={`${sectionClassName} mt-6`}>
                <h3 className={sectionTitleClassName}>Dates</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Use the date picker, or type a calendar date. Shown below as
                  DD/MM/YYYY (Australian English).
                </p>
                <div className="mt-3 grid w-full min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
                  {DATE_FIELDS.map((field) => (
                    <AuDateField
                      key={`${activeTask.id}-${field.key}`}
                      id={`${field.key}-${activeTask.id}`}
                      label={field.label}
                      value={activeTask[field.key]}
                      onCommit={(next) =>
                        patchTask({ [field.key]: next })
                      }
                    />
                  ))}
                </div>
              </section>

              {/* Checklist */}
              <section className={`${sectionClassName} mt-8`}>
                <div className="flex w-full min-w-0 max-w-full items-end justify-between gap-3">
                  <h3 className={`${sectionTitleClassName} min-w-0`}>
                    Checklist
                  </h3>
                  <p className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {totalCount === 0
                      ? "No items yet"
                      : `${completedCount} of ${totalCount} items completed`}
                  </p>
                </div>

                <div
                  className="mt-3 h-2 w-full max-w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
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

                <ul className="mt-4 w-full min-w-0 max-w-full space-y-2">
                  {subtasks.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No checklist items yet. Add one below.
                    </li>
                  ) : (
                    subtasks.map((item) => (
                      <li
                        key={item.id}
                        className="flex w-full min-w-0 max-w-full items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/80"
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
                          className="mt-0.5 size-4 shrink-0 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-500 dark:bg-zinc-950"
                        />
                        <label
                          htmlFor={`subtask-${item.id}`}
                          className={[
                            "min-w-0 flex-1 break-words text-sm leading-snug",
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
                  className="mt-3 flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row"
                >
                  <input
                    type="text"
                    value={checklistDraft}
                    onChange={(event) => setChecklistDraft(event.target.value)}
                    className={`${fieldClassName} flex-1`}
                    placeholder="Add checklist item"
                    aria-label="New checklist item"
                  />
                  <InstantTooltipButton
                    type="submit"
                    disabled={!checklistDraft.trim() || !onAddSubtask}
                    tooltip={
                      !onAddSubtask
                        ? "Checklist updates are unavailable right now"
                        : "Please enter a checklist item name first"
                    }
                    className={primaryButtonClassName}
                  >
                    Add checklist item
                  </InstantTooltipButton>
                </form>
              </section>

              {/* Comments — Wave 3 UI placeholder */}
              <section className={`${sectionClassName} mt-8 pb-2`}>
                <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2">
                  <h3 className={`${sectionTitleClassName} min-w-0`}>
                    Comments
                  </h3>
                  <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
                    Wave 3 placeholder
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Conversation UI is ready now; cloud sync arrives in Wave 3.
                </p>

                <ul className="mt-4 w-full min-w-0 max-w-full space-y-3">
                  {comments.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No comments yet.
                    </li>
                  ) : (
                    comments.map((comment) => (
                      <li
                        key={comment.id}
                        className="w-full min-w-0 max-w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/80"
                      >
                        <div className="flex w-full min-w-0 items-baseline justify-between gap-2">
                          <p className="min-w-0 truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                            {resolveUserName(comment.userId)}
                          </p>
                          <time
                            dateTime={comment.createdAt}
                            className="shrink-0 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400"
                          >
                            {formatAuDateTime(comment.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1.5 break-words whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                          {comment.content}
                        </p>
                      </li>
                    ))
                  )}
                </ul>

                <form
                  onSubmit={handlePostComment}
                  className="mt-3 w-full min-w-0 max-w-full space-y-2"
                >
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
                  <InstantTooltipButton
                    type="submit"
                    disabled={!commentDraft.trim() || !onPostComment}
                    tooltip={
                      !onPostComment
                        ? "Comments are unavailable right now"
                        : "Please enter comment text first"
                    }
                    className={primaryButtonClassName}
                  >
                    Post comment
                  </InstantTooltipButton>
                </form>
              </section>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

