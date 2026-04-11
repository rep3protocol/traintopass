"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ADMIN_BROADCAST_USER_EMAIL } from "@/lib/admin-broadcast-email";

const dropdownLinkClass =
  "block px-4 py-2.5 text-xs uppercase tracking-widest text-neutral-400 hover:text-forge-accent hover:bg-forge-bg";

const trophyIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-3.5 w-3.5 shrink-0"
    fill="currentColor"
  >
    <path d="M19 2h-3V1a1 1 0 0 0-2 0v1h-4V1a1 1 0 0 0-2 0v1H5a1 1 0 0 0-1 1v2a5 5 0 0 0 4 4.9V11a4 4 0 0 0 3 3.87V18H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-3.13A4 4 0 0 0 16 11V9.9A5 5 0 0 0 20 5V3a1 1 0 0 0-1-1Zm-13 3V4h2v3.82A3 3 0 0 1 6 5Zm12 0a3 3 0 0 1-2 2.82V4h2v1Z" />
  </svg>
);

export function SiteHeader() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const shortName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "";

  const isAdminBroadcast =
    session?.user?.email?.trim().toLowerCase() ===
    ADMIN_BROADCAST_USER_EMAIL;

  const avatarInitial = (shortName.trim()[0] || "U").toUpperCase();

  const closeMobile = () => setMobileOpen(false);

  const desktopNavLinkClass =
    "text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest";

  const drawerLinkClass =
    "block text-sm uppercase tracking-widest text-neutral-400 hover:text-forge-accent";

  return (
    <header className="border-b border-forge-border px-4 sm:px-8 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-8">
          <Link
            href="/"
            className="font-heading text-2xl tracking-wide sm:text-3xl"
          >
            <span className="text-white">TRAIN TO</span>{" "}
            <span className="text-forge-accent">PASS</span>
          </Link>
          <nav className="hidden flex-wrap items-center gap-4 sm:flex sm:gap-6">
            <Link href="/groups" className={desktopNavLinkClass}>
              Units
            </Link>
            <Link href="/enlist" className={desktopNavLinkClass}>
              Enlist Prep
            </Link>
            <Link href="/challenge" className={desktopNavLinkClass}>
              Challenge
            </Link>
            <Link
              href="/leaderboard"
              className={`${desktopNavLinkClass} inline-flex items-center gap-1`}
            >
              {trophyIcon}
              Leaderboard
            </Link>
            <Link href="/pricing" className={desktopNavLinkClass}>
              Pricing
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          {status === "loading" ? (
            <span className="text-xs uppercase tracking-widest text-neutral-600">
              …
            </span>
          ) : session?.user ? (
            <>
              <nav className="hidden items-center gap-4 sm:flex sm:gap-6">
                <Link href="/dashboard" className={desktopNavLinkClass}>
                  Dashboard
                </Link>
                <Link href="/log" className={desktopNavLinkClass}>
                  Log
                </Link>
                {isAdminBroadcast ? (
                  <Link
                    href="/admin/broadcast"
                    className={desktopNavLinkClass}
                  >
                    Admin Broadcast
                  </Link>
                ) : null}
              </nav>
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  aria-expanded={avatarOpen}
                  aria-haspopup="menu"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-forge-accent text-xs font-bold uppercase text-forge-bg"
                  onClick={() => setAvatarOpen((open) => !open)}
                >
                  {avatarInitial}
                </button>
                {avatarOpen ? (
                  <div
                    className="absolute right-0 z-50 mt-2 w-40 border border-forge-border bg-forge-panel shadow-lg"
                    role="menu"
                  >
                    <Link
                      href="/account"
                      className={dropdownLinkClass}
                      role="menuitem"
                      onClick={() => setAvatarOpen(false)}
                    >
                      My Account
                    </Link>
                    <button
                      type="button"
                      className={`${dropdownLinkClass} w-full text-left`}
                      role="menuitem"
                      onClick={() => {
                        setAvatarOpen(false);
                        void signOut();
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className={`hidden sm:inline-block ${desktopNavLinkClass}`}
            >
              Sign In
            </Link>
          )}
          <button
            type="button"
            className="p-1 text-2xl leading-none text-neutral-400 hover:text-forge-accent sm:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            ☰
          </button>
        </div>
      </div>
      {mobileOpen ? (
        <nav
          className="space-y-3 border-t border-forge-border bg-forge-panel px-4 py-4 sm:hidden"
          aria-label="Mobile"
        >
          <Link href="/groups" className={drawerLinkClass} onClick={closeMobile}>
            Units
          </Link>
          <Link href="/enlist" className={drawerLinkClass} onClick={closeMobile}>
            Enlist Prep
          </Link>
          <Link
            href="/challenge"
            className={drawerLinkClass}
            onClick={closeMobile}
          >
            Challenge
          </Link>
          <Link
            href="/leaderboard"
            className={`${drawerLinkClass} flex items-center gap-1`}
            onClick={closeMobile}
          >
            {trophyIcon}
            Leaderboard
          </Link>
          <Link
            href="/pricing"
            className={drawerLinkClass}
            onClick={closeMobile}
          >
            Pricing
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className={drawerLinkClass}
                onClick={closeMobile}
              >
                Dashboard
              </Link>
              <Link href="/log" className={drawerLinkClass} onClick={closeMobile}>
                Log
              </Link>
              {isAdminBroadcast ? (
                <Link
                  href="/admin/broadcast"
                  className={drawerLinkClass}
                  onClick={closeMobile}
                >
                  Admin Broadcast
                </Link>
              ) : null}
              <div className="border-t border-forge-border pt-3">
                <Link
                  href="/account"
                  className={drawerLinkClass}
                  onClick={closeMobile}
                >
                  My Account
                </Link>
                <button
                  type="button"
                  className={`${drawerLinkClass} w-full text-left`}
                  onClick={() => {
                    closeMobile();
                    void signOut();
                  }}
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className={drawerLinkClass}
              onClick={closeMobile}
            >
              Sign In
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
