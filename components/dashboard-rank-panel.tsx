"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RankBadge, LADDER_REPRESENTATIVE_RANKS, LADDER_LABELS } from "@/components/rank-badge";
import {
  parseRankId,
  rankDisplayGrade,
  rankName,
  rankTierIndex,
  RANK_ORDER,
  type RankId,
} from "@/lib/ranks";

type CalcJson = {
  rank?: string;
  rankName?: string;
  nextRank?: string | null;
  nextRankRequirement?: string;
  progress?: number;
};

type Props = {
  paid: boolean;
  initialRank: RankId;
  initialStreak: number;
};

export function DashboardRankPanel({
  paid,
  initialRank,
  initialStreak,
}: Props) {
  const [streak, setStreak] = useState(initialStreak);
  const [calc, setCalc] = useState<CalcJson | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const sr = await fetch("/api/rank/streak", { method: "POST" });
        if (sr.ok) {
          const j = (await sr.json()) as { streak?: number };
          if (typeof j.streak === "number") setStreak(j.streak);
        }
      } catch {
        /* silent */
      }
      try {
        const cr = await fetch("/api/rank/calculate", { method: "POST" });
        if (cr.ok) {
          setCalc((await cr.json()) as CalcJson);
        }
      } catch {
        /* silent */
      }
    })();
  }, []);

  const rank = parseRankId(calc?.rank ?? initialRank);
  const displayName = calc?.rankName ?? rankName(rank);
  const eGrade = rankDisplayGrade(rank);
  const nextReq = calc?.nextRankRequirement ?? "—";
  const progress =
    typeof calc?.progress === "number" ? calc.progress : 0;
  const pct = Math.round(progress * 100);

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <RankBadge rank={rank} size="large" />
        <div className="flex-1 space-y-2">
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Your rank
          </p>
          <p className="font-heading text-2xl sm:text-3xl text-white tracking-wide">
            {displayName}
            <span className="text-forge-accent"> — {eGrade}</span>
          </p>
          <p className="text-sm text-neutral-400">
            🔥 {streak}-day streak
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[11px] uppercase tracking-wider text-neutral-500">
          <span>Next promotion</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 border border-forge-border bg-forge-bg overflow-hidden">
          <div
            className="h-full bg-forge-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">{nextReq}</p>
      </div>

      {!paid ? (
        <div className="pt-4 border-t border-forge-border space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-neutral-600">
            Rank ladder
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {RANK_ORDER.map((r) => {
              const isLocked = rankTierIndex(r) > rankTierIndex(rank);
              const isHighlighted = r === rank;
              return (
                <div
                  key={r}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div
                    title={
                      isLocked ? "Unlock Full Access — $7/mo" : undefined
                    }
                  >
                    <RankBadge
                      rank={r}
                      size="small"
                      locked={isLocked}
                      highlighted={isHighlighted}
                    />
                  </div>
                  <span className="text-[8px] text-neutral-600 text-center max-w-[4.5rem] leading-tight">
                    {rankName(r)}
                  </span>
                </div>
              );
            })}
          </div>
          <Link
            href="/calculate"
            className="inline-block text-xs font-semibold uppercase tracking-widest text-forge-accent hover:underline"
          >
            Unlock Full Access — $7/mo
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function LandingRankLadder() {
  return (
    <section className="mt-20 w-full max-w-5xl text-left">
      <h2 className="font-heading text-3xl sm:text-4xl text-white tracking-wide text-center">
        EARN YOUR RANK
      </h2>
      <p className="mt-4 text-center text-sm text-neutral-500 max-w-xl mx-auto leading-relaxed">
        Every assessment, every training day, every streak — earns you a
        promotion
      </p>
      <div className="mt-10 flex gap-4 sm:gap-6 overflow-x-auto pb-4 justify-start sm:justify-center">
        {LADDER_REPRESENTATIVE_RANKS.map((r) => (
          <div
            key={r}
            className="flex flex-col items-center gap-2 shrink-0 w-[4.5rem] sm:w-auto"
          >
            <RankBadge rank={r} size="small" />
            <span className="text-[9px] sm:text-[10px] tracking-wide text-neutral-500 text-center leading-tight">
              {LADDER_LABELS[r] ?? rankName(r)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
