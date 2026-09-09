"use client";

import type { ReactNode } from "react";

type InstantHoverTipProps = {
  label: string;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom";
};

/** Instant (0ms) CSS hover tip — avoids native `title` delay. */
export default function InstantHoverTip({
  label,
  children,
  className = "",
  side = "top",
}: InstantHoverTipProps) {
  const position =
    side === "bottom"
      ? "top-full mt-1.5"
      : "bottom-full mb-1.5";

  return (
    <span className={`group relative inline-flex min-w-0 ${className}`.trim()}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-50 ${position} w-max max-w-[18rem] -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 invisible shadow-lg transition-none duration-0 group-hover:visible group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-950`}
      >
        {label}
      </span>
    </span>
  );
}
