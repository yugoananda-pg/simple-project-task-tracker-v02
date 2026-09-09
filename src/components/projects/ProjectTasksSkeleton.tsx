type ProjectTasksSkeletonProps = {
  label?: string;
};

export default function ProjectTasksSkeleton({
  label = "Refreshing project tasks…",
}: ProjectTasksSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="absolute inset-0 z-10 rounded-xl border border-zinc-200 bg-white/85 p-4 backdrop-blur-[1px] dark:border-zinc-700 dark:bg-zinc-950/90"
    >
      <p className="sr-only">{label}</p>
      <p className="mb-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </p>
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-10 w-full max-w-md rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-14 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-14 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-14 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-14 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
