"use client";

import { useState } from "react";

type Props = {
  referralLink: string;
  completedReferred: number;
};

export function AccountReferralSection({
  referralLink,
  completedReferred,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  }

  const pct = Math.min(100, (completedReferred / 3) * 100);

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
      <p className="text-[10px] uppercase tracking-widest text-neutral-500">
        MISSION: INVITE 3 FRIENDS
      </p>
      <h2 className="font-heading text-xl text-white tracking-wide">
        Refer a Friend
      </h2>
      <p className="text-sm text-neutral-400 leading-relaxed">
        Share your link. Friends get their first month free when they subscribe;
        when they pay their first month, you earn a free month too.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <code className="flex-1 text-xs text-neutral-300 break-all border border-forge-border bg-forge-bg px-3 py-2 font-mono">
          {referralLink}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="border border-forge-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors shrink-0"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="space-y-2">
        <div className="h-2 bg-forge-bg border border-forge-border overflow-hidden rounded-none">
          <div
            className="h-full bg-forge-accent transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-neutral-400">
          {completedReferred} / 3 completed
        </p>
        <p className="text-xs text-neutral-500">
          Reward: +1 free month per referral
        </p>
      </div>
    </section>
  );
}
