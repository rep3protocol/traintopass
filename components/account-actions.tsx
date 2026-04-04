"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

type Props = {
  canOpenBillingPortal: boolean;
};

export function AccountActions({ canOpenBillingPortal }: Props) {
  const [portalBusy, setPortalBusy] = useState(false);

  async function openPortal() {
    setPortalBusy(true);
    try {
      const res = await fetch("/api/create-portal-session", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
        return;
      }
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        type="button"
        onClick={() => void openPortal()}
        disabled={portalBusy || !canOpenBillingPortal}
        title={
          !canOpenBillingPortal
            ? "Subscribe first to manage billing in Stripe."
            : undefined
        }
        className="border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
      >
        {portalBusy ? "Loading…" : "Manage Subscription"}
      </button>
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
