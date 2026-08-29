import Link from "next/link";

import UserDropdownMenu from "@/src/components/layout/UserDropdownMenu";
import { getSessionUser } from "@/src/lib/rbac";

export default async function AppHeader() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-slate-700/80 bg-slate-800 text-slate-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-slate-50 transition hover:text-white"
        >
          Simple Project Task Tracker 2.0
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <nav aria-label="Primary">
                <Link
                  href="/"
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  Projects
                </Link>
              </nav>
              <UserDropdownMenu
                name={user.name}
                email={user.email}
                globalRole={user.globalRole}
              />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 transition hover:bg-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
