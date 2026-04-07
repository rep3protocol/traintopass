"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function SiteHeader() {
  const { data: session, status } = useSession();

  const shortName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "";

  return (
    <header className="border-b border-forge-border px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4 sm:gap-8">
        <Link
          href="/"
          className="font-heading text-2xl sm:text-3xl tracking-wide text-white"
        >
          AFT <span className="text-forge-accent">FORGE</span>
        </Link>
        <Link
          href="/about"
          className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
        >
          About
        </Link>
        <Link
          href="/groups"
          className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
        >
          Units
        </Link>
        <Link
          href="/enlist"
          className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
        >
          Enlist Prep
        </Link>
        <Link
          href="/challenge"
          className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
        >
          Challenge
        </Link>
        <Link
          href="/leaderboard"
          className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest inline-flex items-center gap-1"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="currentColor"
          >
            <path d="M19 2h-3V1a1 1 0 0 0-2 0v1h-4V1a1 1 0 0 0-2 0v1H5a1 1 0 0 0-1 1v2a5 5 0 0 0 4 4.9V11a4 4 0 0 0 3 3.87V18H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-3.13A4 4 0 0 0 16 11V9.9A5 5 0 0 0 20 5V3a1 1 0 0 0-1-1Zm-13 3V4h2v3.82A3 3 0 0 1 6 5Zm12 0a3 3 0 0 1-2 2.82V4h2v1Z" />
          </svg>
          Leaderboard
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {status === "loading" ? (
          <span className="text-xs text-neutral-600 uppercase tracking-widest">
            …
          </span>
        ) : session?.user ? (
          <>
            <Link
              href="/dashboard"
              className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
            >
              Dashboard
            </Link>
            <Link
              href="/account"
              className="text-sm text-neutral-400 hover:text-forge-accent max-w-[160px] truncate"
              title={shortName}
            >
              {shortName}
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
          >
            Sign In
          </Link>
        )}
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
        >
          Home
        </Link>
      </div>
    </header>
  );
}
