"use client";

import { useState } from "react";

type Props = {
  referralLink: string;
  totalReferred: number;
  completedReferred: number;
  pendingReferred: number;
  monthsEarned: number;
};

export function AccountReferralSection({
  referralLink,
  totalReferred,
  completedReferred,
  pendingReferred,
  monthsEarned,
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

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
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
      <ul className="text-sm text-neutral-500 space-y-1">
        <li>
          Friends referred:{" "}
          <span className="text-neutral-300">{totalReferred}</span>
        </li>
        <li>
          Months earned:{" "}
          <span className="text-neutral-300">{monthsEarned}</span>
        </li>
        <li>
          Pending / completed:{" "}
          <span className="text-neutral-300">
            {pendingReferred} / {completedReferred}
          </span>
        </li>
      </ul>
    </section>
  );
}
