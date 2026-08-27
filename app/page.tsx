"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getServerStoreSnapshot,
  getStoreSnapshot,
  subscribeStore,
} from "@/src/lib/store";

export default function HomePage() {
  const store = useSyncExternalStore(
    subscribeStore,
    getStoreSnapshot,
    getServerStoreSnapshot,
  );

  const visibleProjects = [...store.projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Projects
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Open a project to switch between List View and Kanban View, then edit
          Planner-style task details from the board.
        </p>
      </div>

      <div className="mt-8">
        {visibleProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              No projects yet
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Seed data will appear on first visit in this browser.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visibleProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-md dark:shadow-black/25 dark:hover:border-zinc-500 dark:hover:bg-zinc-900/95 dark:focus-visible:outline-zinc-100"
                >
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {project.name}
                  </h2>
                  {project.description ? (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {project.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm italic text-zinc-400">
                      No description
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
