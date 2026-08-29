"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/src/lib/actions/auth";
import { getRoleLabel } from "@/src/lib/role-labels";
import type { GlobalRole } from "@/src/lib/types";

export type UserDropdownMenuProps = {
  name: string;
  email: string;
  globalRole: GlobalRole;
};

export default function UserDropdownMenu({
  name,
  email,
  globalRole,
}: UserDropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500/70 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-slate-300 hover:bg-slate-700/60"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="max-w-[10rem] truncate">{name}</span>
        <ChevronDown
          className={[
            "size-4 shrink-0 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-600/80 bg-slate-800 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="border-b border-slate-700/80 px-4 py-3 dark:border-zinc-700">
            <p className="truncate text-sm font-semibold text-slate-50">
              {name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{email}</p>
            <span className="mt-2 inline-flex items-center rounded-full border border-slate-500/60 bg-slate-700/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100">
              {getRoleLabel(globalRole)}
            </span>
          </div>

          <div className="px-2 py-2">
            <button
              type="button"
              role="menuitem"
              disabled
              className="flex w-full cursor-not-allowed items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 dark:text-zinc-500"
            >
              Settings
              <span className="ml-auto text-[10px] uppercase tracking-wide">
                Soon
              </span>
            </button>
          </div>

          <div className="border-t border-slate-700/80 px-2 py-2 dark:border-zinc-700">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-300 transition hover:bg-red-950/40 hover:text-red-200"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
