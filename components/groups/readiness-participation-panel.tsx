"use client";

import { useState } from "react";

export type StaleNameRow = { id: string; name: string };

type Props = {
  ngLabel: string;
  ngCurrent: number;
  ngTotal: number;
  ngPct: number | null;
  adLabel: string;
  adCurrent: number;
  adTotal: number;
  adPct: number | null;
  stale365: StaleNameRow[];
  stale180: StaleNameRow[];
};

export function ReadinessParticipationPanel({
  ngLabel,
  ngCurrent,
  ngTotal,
  ngPct,
  adLabel,
  adCurrent,
  adTotal,
  adPct,
  stale365,
  stale180,
}: Props) {
  const [windowDays, setWindowDays] = useState<365 | 180>(365);
  const stale = windowDays === 365 ? stale365 : stale180;

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-heading text-xl text-white tracking-wide">
          Participation
        </h2>
        <div
          className="flex rounded border border-forge-border overflow-hidden text-[10px] uppercase tracking-widest"
          role="group"
          aria-label="Window for not-tested list"
        >
          <button
            type="button"
            onClick={() => setWindowDays(365)}
            className={`px-3 py-1.5 transition-colors ${
              windowDays === 365
                ? "bg-forge-accent/20 text-forge-accent"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            365-day list
          </button>
          <button
            type="button"
            onClick={() => setWindowDays(180)}
            className={`px-3 py-1.5 border-l border-forge-border transition-colors ${
              windowDays === 180
                ? "bg-forge-accent/20 text-forge-accent"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            180-day list
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">
        National Guard / Reserve members count as current with a score in the last
        365 days; Active Duty with a score in the last 180 days. The list below uses
        a single window for everyone (toggle).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded border border-forge-border bg-forge-bg/50 p-4 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            {ngLabel}
          </p>
          <p className="font-heading text-3xl text-white tabular-nums">
            {ngTotal === 0 ? "—" : `${ngPct ?? 0}%`}
          </p>
          <p className="text-xs text-neutral-400">
            {ngTotal === 0
              ? "No members in this bucket"
              : `${ngCurrent} / ${ngTotal} current (365-day rule)`}
          </p>
        </div>
        <div className="rounded border border-forge-border bg-forge-bg/50 p-4 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            {adLabel}
          </p>
          <p className="font-heading text-3xl text-white tabular-nums">
            {adTotal === 0 ? "—" : `${adPct ?? 0}%`}
          </p>
          <p className="text-xs text-neutral-400">
            {adTotal === 0
              ? "No members in this bucket"
              : `${adCurrent} / ${adTotal} current (180-day rule)`}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500">
          No score in the last {windowDays} days
        </p>
        {stale.length === 0 ? (
          <p className="text-sm text-forge-accent">All members have a recent score.</p>
        ) : (
          <ul className="text-sm text-neutral-200 space-y-1 list-disc list-inside">
            {stale.map((r) => (
              <li key={r.id}>{r.name}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
