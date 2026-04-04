"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AGE_GROUPS, type AgeGroup } from "@/lib/aft-scoring";

type Row = {
  id: number;
  age_group: string;
  gender: string;
  total_score: number;
  submitted_at: string;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function LeaderboardPage() {
  const [gender, setGender] = useState<"male" | "female">("male");
  const [groups, setGroups] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/leaderboard?gender=${gender}`)
      .then((r) => r.json() as Promise<{ groups?: Record<string, Row[]> }>)
      .then((data) => {
        if (!cancelled && data.groups) setGroups(data.groups);
      })
      .catch(() => {
        if (!cancelled) setGroups({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gender]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-4xl mx-auto w-full">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            Leaderboard
          </h1>
          <Link
            href="/results"
            className="text-xs font-medium uppercase tracking-widest text-neutral-500 hover:text-forge-accent transition-colors"
          >
            ← Back to results
          </Link>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Top 10 scores per age group (anonymous submissions).
        </p>

        <div className="mt-8 flex gap-0 border border-forge-border w-fit">
          <button
            type="button"
            onClick={() => setGender("male")}
            className={`px-6 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
              gender === "male"
                ? "bg-forge-accent text-forge-bg"
                : "bg-forge-panel text-neutral-400 hover:text-white"
            }`}
          >
            Male
          </button>
          <button
            type="button"
            onClick={() => setGender("female")}
            className={`px-6 py-2 text-xs font-semibold uppercase tracking-widest border-l border-forge-border transition-colors ${
              gender === "female"
                ? "bg-forge-accent text-forge-bg"
                : "bg-forge-panel text-neutral-400 hover:text-white"
            }`}
          >
            Female
          </button>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="mt-10 space-y-10">
            {(AGE_GROUPS as AgeGroup[]).map((ag) => {
              const rows = groups[ag] ?? [];
              return (
                <section key={ag} className="border border-forge-border bg-forge-panel">
                  <h2 className="font-heading text-xl text-forge-accent tracking-wide px-4 py-3 border-b border-forge-border">
                    {ag}
                  </h2>
                  {rows.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-neutral-600">
                      No scores yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-forge-border">
                      {rows.map((r, i) => (
                        <li
                          key={r.id}
                          className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-4 py-3 text-sm"
                        >
                          <span className="font-heading text-lg text-neutral-500 w-8">
                            {i + 1}
                          </span>
                          <span className="text-neutral-300">{r.age_group}</span>
                          <span className="font-heading text-xl text-white text-right">
                            {r.total_score}
                          </span>
                          <span className="text-xs text-neutral-500 text-right w-24">
                            {formatDate(r.submitted_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
