import type { TaskPicInfo } from "@/src/lib/assignee-display";
import { getTaskPicDisplayName, isCustomPic } from "@/src/lib/assignee-display";

type PicLabelProps = {
  task: TaskPicInfo;
  className?: string;
  showCustomTag?: boolean;
};

/** Instant CSS tooltip — no browser title delay. */
export default function PicLabel({
  task,
  className = "",
  showCustomTag = true,
}: PicLabelProps) {
  const custom = isCustomPic(task);
  const label = getTaskPicDisplayName(task);

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`.trim()}>
      <span className="min-w-0 truncate" aria-label={label}>
        {label}
      </span>
      {showCustomTag && custom ? (
        <span className="group relative shrink-0">
          <span className="rounded bg-zinc-200 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            Custom
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity duration-0 group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Unregistered PIC
          </span>
        </span>
      ) : null}
    </span>
  );
}
