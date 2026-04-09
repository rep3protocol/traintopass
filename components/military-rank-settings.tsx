"use client";

import { useState } from "react";
import { MILITARY_RANK_SELECT_GROUPS } from "@/lib/military-rank";

type Props = {
  initialRank: string | null;
};

export function MilitaryRankSettings({ initialRank }: Props) {
  const [value, setValue] = useState(
    initialRank?.trim() ? initialRank.trim() : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/military-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          militaryRank: next === "" ? null : next,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        militaryRank?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setValue(data.militaryRank?.trim() ? data.militaryRank.trim() : "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-forge-border bg-forge-panel p-5 space-y-3">
      <div>
        <label
          htmlFor="military-rank-select"
          className="font-heading text-lg text-white tracking-wide block"
        >
          Military rank
        </label>
        <p className="mt-1 text-xs text-neutral-500 leading-relaxed max-w-md">
          Shown on unit leaderboards and readiness views. Your app progression
          rank still appears on your dashboard and public profile.
        </p>
      </div>
      <select
        id="military-rank-select"
        disabled={busy}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          void save(next);
        }}
        className="mt-2 w-full max-w-md bg-forge-bg border border-forge-border px-3 py-2 text-sm text-neutral-200 disabled:opacity-50"
      >
        <option value="">None / Civilian</option>
        {MILITARY_RANK_SELECT_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
