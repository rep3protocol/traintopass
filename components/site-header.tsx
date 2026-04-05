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
