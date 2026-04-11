"use client";

import { useState } from "react";

type Props = {
  userId: string;
  groupId: string;
};

const btnBase =
  "inline-flex items-center justify-center rounded border border-forge-border bg-forge-bg px-2.5 py-1 text-[11px] font-medium text-neutral-200 hover:border-forge-accent/50 hover:text-white transition-colors";

export function AtRiskActions({ userId, groupId }: Props) {
  const [notifySent, setNotifySent] = useState(false);
  const [pending, setPending] = useState(false);

  async function notify() {
    if (pending || notifySent) return;
    setPending(true);
    try {
      const res = await fetch("/api/groups/notify-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupId }),
      });
      if (res.ok) setNotifySent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <td className="py-3 pl-2 text-left align-top whitespace-nowrap">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/dashboard?assignPlan=${encodeURIComponent(userId)}`}
          className={btnBase}
        >
          Assign Plan
        </a>
        <button
          type="button"
          className={`${btnBase} disabled:opacity-50`}
          onClick={() => void notify()}
          disabled={pending || notifySent}
        >
          {pending ? "…" : "Notify"}
        </button>
        {notifySent ? (
          <span className="text-[11px] text-emerald-400">Sent</span>
        ) : null}
      </div>
    </td>
  );
}
