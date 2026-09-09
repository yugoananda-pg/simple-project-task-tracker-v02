"use client";

import { useMemo, useRef, useState } from "react";

import type { ProjectMemberUser } from "@/src/lib/actions/projects";
import {
  getTaskPicDisplayName,
  isCustomPic,
} from "@/src/lib/assignee-display";
import type { Task } from "@/src/lib/types";
import PicLabel from "@/src/components/tasks/PicLabel";

type AssigneePicFieldProps = {
  task: Task;
  members: ProjectMemberUser[];
  disabled?: boolean;
  labelClassName: string;
  fieldClassName: string;
  onCommit: (patch: Pick<Task, "assigneeId" | "assigneeName">) => void;
};

export default function AssigneePicField({
  task,
  members,
  disabled = false,
  labelClassName,
  fieldClassName,
  onCommit,
}: AssigneePicFieldProps) {
  const [query, setQuery] = useState(() => getTaskPicDisplayName(task) === "Unassigned" ? "" : getTaskPicDisplayName(task));
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(needle) ||
        member.email.toLowerCase().includes(needle),
    );
  }, [members, query]);

  function clearBlurTimer() {
    if (blurTimer.current != null) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function commitRegistered(member: ProjectMemberUser) {
    setQuery(member.name);
    setOpen(false);
    onCommit({ assigneeId: member.id, assigneeName: member.name });
  }

  function commitCustomOrClear(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setQuery("");
      onCommit({ assigneeId: null, assigneeName: "" });
      return;
    }
    const exact = members.find(
      (member) => member.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exact) {
      commitRegistered(exact);
      return;
    }
    setQuery(trimmed);
    onCommit({ assigneeId: null, assigneeName: trimmed });
  }

  if (disabled) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <p className={labelClassName}>Assignee (PIC)</p>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100">
          <PicLabel task={task} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0 max-w-full">
      <label htmlFor={`assignee-${task.id}`} className={labelClassName}>
        Assignee (PIC)
      </label>
      <input
        id={`assignee-${task.id}`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={query === "Unassigned" ? "" : query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          clearBlurTimer();
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => {
            setOpen(false);
            commitCustomOrClear(query);
          }, 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            clearBlurTimer();
            if (filtered[0] && query.trim()) {
              const needle = query.trim().toLowerCase();
              const exact = filtered.find(
                (member) => member.name.toLowerCase() === needle,
              );
              if (exact) {
                commitRegistered(exact);
                return;
              }
              if (filtered.length === 1) {
                commitRegistered(filtered[0]!);
                return;
              }
            }
            commitCustomOrClear(query);
            setOpen(false);
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={fieldClassName}
        placeholder="Search members or type a custom PIC…"
        autoComplete="off"
        maxLength={120}
      />

      {open ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        >
          <li>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                clearBlurTimer();
                setQuery("");
                setOpen(false);
                onCommit({ assigneeId: null, assigneeName: "" });
              }}
            >
              Unassigned
            </button>
          </li>
          {filtered.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  clearBlurTimer();
                  commitRegistered(member);
                }}
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {member.name}
                </span>
                <span className="text-[11px] text-zinc-500">{member.email}</span>
              </button>
            </li>
          ))}
          {query.trim() &&
          !members.some(
            (member) =>
              member.name.toLowerCase() === query.trim().toLowerCase(),
          ) ? (
            <li>
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  clearBlurTimer();
                  commitCustomOrClear(query);
                  setOpen(false);
                }}
              >
                Use custom PIC: “{query.trim()}”
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      <p className="mt-1 break-words text-[11px] text-zinc-500 dark:text-zinc-400">
        {isCustomPic(task)
          ? "Custom unregistered PIC — press Enter to save typed names."
          : "Type to filter members, or Enter to set a custom PIC."}
      </p>
    </div>
  );
}
