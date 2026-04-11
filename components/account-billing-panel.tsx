"use client";

import { useState } from "react";

type BillingButtonProps = {
  canOpenBillingPortal: boolean;
};

function AccountBillingButton({ canOpenBillingPortal }: BillingButtonProps) {
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
    <button
      type="button"
      onClick={() => void openPortal()}
      disabled={portalBusy || !canOpenBillingPortal}
      title={
        !canOpenBillingPortal
          ? "Subscribe first to manage billing in Stripe."
          : undefined
      }
      className="border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors w-full sm:w-auto"
    >
      {portalBusy ? "Loading…" : "Manage Subscription"}
    </button>
  );
}

function formatNextBillingLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  nextBillingDate: string | null;
  plan: string | null;
  canOpenBillingPortal: boolean;
};

export function AccountBillingPanel({
  nextBillingDate,
  plan,
  canOpenBillingPortal,
}: Props) {
  const displayPlan = plan === "Pro" ? "Pro" : "Free";

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-3">
      <h2 className="font-heading text-xl text-white tracking-wide">
        Subscription
      </h2>
      <p className="text-sm text-neutral-400">
        <span className="text-neutral-500">Plan:</span>{" "}
        <span className="text-neutral-200">{displayPlan}</span>
      </p>
      <p className="text-sm text-neutral-400">
        <span className="text-neutral-500">Next billing:</span>{" "}
        <span className="text-neutral-200">
          {formatNextBillingLabel(nextBillingDate)}
        </span>
      </p>
      <AccountBillingButton canOpenBillingPortal={canOpenBillingPortal} />
    </section>
  );
}
