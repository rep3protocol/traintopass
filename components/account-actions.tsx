"use client";

import { signOut } from "next-auth/react";

export function AccountActions() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/" })}
        className="border border-forge-border bg-forge-panel px-8 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-300 hover:border-forge-accent hover:text-forge-accent transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
