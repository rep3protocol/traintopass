"use client";

import { Fragment, useEffect, useState } from "react";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
import { RankBadge } from "@/components/rank-badge";
import type { RankBadgeVariant } from "@/lib/ranks";
import { GroupAverageChart } from "@/components/groups/group-average-chart";

export type LeaderboardRow = {
  userId: string;
  name: string;
  rank: RankBadgeVariant;
  rankGrade: string;
  bestTotalScore: number;
  ageGroup: string;
  gender: string;
  bestScoreDate: string | null;
  weakEvents: string[];
  pass: boolean;
};

type Props = {
  groupId: string;
  isLeader: boolean;
  heading?: string;
};

export function UnitLeaderboard({
  groupId,
  isLeader,
  heading = "UNIT LEADERBOARD",
}: Props) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [averageScore, setAverageScore] = useState(0);
  const [chart, setChart] = useState<{ date: string; avg: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/groups/${groupId}/leaderboard`);
        const data = (await res.json()) as {
          leaderboard?: LeaderboardRow[];
          averageScore?: number;
          chart?: { date: string; avg: number }[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setRows([]);
          setAverageScore(0);
          setChart([]);
          return;
        }
        setRows(data.leaderboard ?? []);
        setAverageScore(Number(data.averageScore ?? 0));
        setChart(data.chart ?? []);
      } catch {
        if (!cancelled) {
          setRows([]);
          setAverageScore(0);
          setChart([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (loading) {
    return (
      <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
        <h2 className="font-heading text-xl text-white tracking-wide">
          {heading}
        </h2>
        <p className="text-xs text-neutral-500">Loading…</p>
      </section>
    );
  }

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-6">
      <h2 className="font-heading text-xl text-white tracking-wide">
        {heading}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-forge-border text-[10px] uppercase tracking-widest text-neutral-500">
              <th className="py-2 pr-2 font-normal">#</th>
              <th className="py-2 pr-2 font-normal w-12" />
              <th className="py-2 pr-2 font-normal">Name</th>
              <th className="py-2 pr-2 font-normal">E-grade</th>
              <th className="py-2 pr-2 font-normal">Best</th>
              <th className="py-2 pr-2 font-normal">Pass</th>
              <th className="py-2 font-normal">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-4 text-xs text-neutral-500"
                >
                  No scores yet. Complete an assessment to appear here.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <Fragment key={r.userId}>
                  <tr
                    className="border-b border-forge-border/80 align-top"
                  >
                    <td className="py-3 pr-2 text-neutral-400 tabular-nums">
                      {i + 1}
                    </td>
                    <td className="py-2 pr-2">
                      <RankBadge rank={r.rank} size="small" />
                    </td>
                    <td className="py-3 pr-2 text-neutral-200">{r.name}</td>
                    <td className="py-3 pr-2 text-neutral-400">
                      {r.rankGrade}
                    </td>
                    <td className="py-3 pr-2 font-heading text-lg text-white tabular-nums">
                      {Math.round(r.bestTotalScore)}
                      <span className="text-[10px] text-neutral-500 font-body font-normal">
                        {" "}
                        / 500
                      </span>
                    </td>
                    <td className="py-3 pr-2">
                      <span
                        className={
                          r.pass
                            ? "text-forge-accent uppercase text-[10px] tracking-wider"
                            : "text-red-400 uppercase text-[10px] tracking-wider"
                        }
                      >
                        {r.pass ? "Pass" : "Fail"}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-neutral-500 whitespace-nowrap">
                      {r.bestScoreDate
                        ? formatDate(
                            r.bestScoreDate.includes("T")
                              ? r.bestScoreDate
                              : `${r.bestScoreDate}T12:00:00Z`
                          ) || "—"
                        : "—"}
                    </td>
                  </tr>
                  {isLeader && r.weakEvents.length > 0 ? (
                    <tr
                      key={`${r.userId}-weak`}
                      className="border-b border-forge-border/80"
                    >
                      <td colSpan={7} className="pb-3 pt-0 pl-14 pr-2">
                        <p className="text-[11px] text-neutral-600 leading-snug">
                          Weak events (below 75): {r.weakEvents.join(" · ")}
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2 border-t border-forge-border flex items-baseline justify-between gap-4">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
          Unit average (all members)
        </span>
        <span className="font-heading text-2xl text-forge-accent tabular-nums">
          {Math.round(averageScore)}
        </span>
      </div>

      <GroupAverageChart points={chart} />
    </section>
  );
}
