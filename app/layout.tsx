import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Simple Project Task Tracker 2.0",
  description:
    "Multi-view project task tracker with Kanban boards and Planner-style task details.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-AU"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        {/* Subtle slate header — elegant contrast against the zinc canvas */}
        <header className="border-b border-slate-700/80 bg-slate-800 text-slate-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-slate-50 transition hover:text-white"
            >
              Simple Project Task Tracker 2.0
            </Link>
            <nav aria-label="Primary">
              <Link
                href="/"
                className="text-sm font-medium text-slate-300 transition hover:text-white"
              >
                Projects
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
