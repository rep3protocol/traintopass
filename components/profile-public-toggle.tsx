"use client";

import { useState } from "react";

type Props = {
  initialPublic: boolean;
};

export function ProfilePublicToggle({ initialPublic }: Props) {
  const [value, setValue] = useState(initialPublic);
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/account/profile-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePublic: next }),
      });
      if (res.ok) {
        setValue(next);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-forge-border bg-forge-panel p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-heading text-lg text-white tracking-wide">
            Public profile
          </p>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed max-w-md">
            When on, anyone with your profile link can see rank, streak,
            scores, and patches — not unit or location.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          role="switch"
          aria-checked={value}
          onClick={() => void toggle(!value)}
          className={`relative h-9 w-16 shrink-0 border transition-colors ${
            value
              ? "border-forge-accent bg-forge-accent/20"
              : "border-forge-border bg-forge-bg"
          } disabled:opacity-50`}
          style={{ borderRadius: 0 }}
        >
          <span
            className={`absolute top-1 h-7 w-7 bg-forge-accent transition-transform ${
              value ? "left-8" : "left-1"
            }`}
            style={{ borderRadius: 0 }}
          />
        </button>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-neutral-600">
        {value ? "Visible" : "Hidden"}
      </p>
    </div>
  );
}
