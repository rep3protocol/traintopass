"use client";

import { useCallback, useEffect, useState } from "react";

type Challenge = {
  id: string;
  challenge_date: string;
  title: string;
  description: string;
  event_type: string;
  target_reps: number | null;
  target_time_seconds: number | null;
};

type DayRow = Challenge & { completed: boolean };

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

type Props = {
  paid: boolean;
  personalLine: string | null;
};

export function ChallengePageClient({ paid, personalLine }: Props) {
  const [today, setToday] = useState<Challenge | null>(null);
  const [completed, setCompleted] = useState(false);
  const [resultText, setResultText] = useState("");
  const [completedCount, setCompletedCount] = useState(0);
  const [yesterday, setYesterday] = useState<DayRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, hRes] = await Promise.all([
        fetch("/api/challenges/today", { cache: "no-store" }),
        fetch("/api/challenges/history", { cache: "no-store" }),
      ]);
      const tJson = (await tRes.json()) as {
        challenge: Challenge | null;
        completion: { result: string | null } | null;
        completedCount?: number;
      };
      const hJson = (await hRes.json()) as { days: DayRow[] };
      setToday(tJson.challenge ?? null);
      setCompleted(!!tJson.completion);
      setResultText(tJson.completion?.result ?? "");
      setCompletedCount(Number(tJson.completedCount ?? 0));
      const yd = yesterdayUtc();
      const yRow = hJson.days?.find((d) => d.challenge_date.slice(0, 10) === yd);
      setYesterday(yRow ?? null);
    } catch {
      setError("Could not load challenge.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!today || completed) return;
    setSubmitBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/challenges/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: resultText }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Could not save.");
        return;
      }
      setCompleted(true);
      setDoneMsg(true);
      await load();
    } catch {
      setError("Could not save.");
    } finally {
      setSubmitBusy(false);
    }
  }

  const todayStr = utcToday();

  return (
    <div className="space-y-10">
      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : error && !today ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}

      {today ? (
        <section className="border border-forge-border bg-forge-panel p-6 sm:p-8 space-y-6">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            {todayStr} · Daily PT
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl text-white tracking-wide leading-tight">
            {today.title}
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {today.description}
          </p>
          {(today.target_reps != null || today.target_time_seconds != null) && (
            <p className="text-xs text-neutral-500 font-mono">
              {today.target_reps != null ? `Target reps: ${today.target_reps}` : null}
              {today.target_reps != null && today.target_time_seconds != null
                ? " · "
                : ""}
              {today.target_time_seconds != null
                ? `Target time: ${today.target_time_seconds}s`
                : null}
            </p>
          )}

          {completed ? (
            <div className="space-y-2">
              <p className="text-forge-accent text-sm font-semibold uppercase tracking-widest">
                ✓ Logged: {resultText || "—"}
              </p>
              {doneMsg ? (
                <p className="text-sm text-neutral-400">
                  Streak updated. Keep earning patches.
                </p>
              ) : null}
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : null}
              <label className="block text-[10px] uppercase tracking-widest text-neutral-500">
                Your result
              </label>
              <input
                type="text"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder='e.g. "32 reps" or "2:45"'
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
              <button
                type="submit"
                disabled={submitBusy}
                className="border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
              >
                {submitBusy ? "Saving…" : "LOG MY RESULT"}
              </button>
            </form>
          )}

          <p className="text-xs text-neutral-500">
            <span className="text-neutral-400">{completedCount}</span> athletes
            completed today&apos;s challenge
          </p>
        </section>
      ) : !loading ? (
        <p className="text-sm text-neutral-500">
          No challenge is published for today yet. Check back later.
        </p>
      ) : null}

      {paid && personalLine ? (
        <section className="border border-forge-accent/40 bg-forge-bg/80 p-6 space-y-2">
          <h2 className="font-heading text-xl text-forge-accent tracking-wide">
            Personal challenge
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">{personalLine}</p>
        </section>
      ) : null}

      {yesterday ? (
        <section className="border border-forge-border bg-forge-panel/60 p-6 opacity-70 grayscale-[0.3]">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
            Yesterday
          </p>
          <h2 className="font-heading text-2xl text-neutral-400 tracking-wide">
            {yesterday.title}
          </h2>
          <p className="text-sm text-neutral-500 mt-2 line-clamp-3">
            {yesterday.description}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-neutral-600 mt-3">
            {yesterday.completed ? "You completed this one" : "Not logged"}
          </p>
        </section>
      ) : null}
    </div>
  );
}
