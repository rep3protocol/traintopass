"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AnalyzeResponseBody } from "@/lib/analyze-types";
import {
  SESSION_TRAINING_DAYS_KEY,
  STORAGE_NEW_RUN_FLAG,
  STORAGE_RESULT_KEY,
} from "@/lib/storage-keys";
import {
  AGE_GROUPS,
  EVENT_LABELS,
  EVENT_ORDER,
  GENDERS,
  type AgeGroup,
  type EventKey,
  type Gender,
  parseMmSsToSeconds,
  progressTone,
  scoreEvent,
} from "@/lib/aft-scoring";

const TIMED_EVENTS = new Set<EventKey>(["sdc", "plk", "twoMR"]);

type FormState = Record<EventKey, string> & {
  ageGroup: AgeGroup;
  gender: Gender;
};

const initialForm = (): FormState => ({
  ageGroup: "17-21",
  gender: "male",
  mdl: "",
  hrp: "",
  sdc: "",
  plk: "",
  twoMR: "",
});

const FIELD_META: Record<
  EventKey,
  { unit: string; inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"] }
> = {
  mdl: { unit: "lbs", inputMode: "decimal" },
  hrp: { unit: "reps", inputMode: "numeric" },
  sdc: { unit: "MM:SS", inputMode: "numeric" },
  plk: { unit: "MM:SS", inputMode: "numeric" },
  twoMR: { unit: "MM:SS", inputMode: "numeric" },
};

const LOADING_MESSAGES = [
  "Analyzing your scores...",
  "Identifying weak events...",
  "Building your training plan...",
  "Almost ready...",
];

function parseEventRaw(key: EventKey, s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  if (TIMED_EVENTS.has(key)) {
    return parseMmSsToSeconds(t);
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function ProgressBar({ score }: { score: number }) {
  const tone = progressTone(score);
  const bg =
    tone === "green"
      ? "bg-forge-accent"
      : tone === "yellow"
        ? "bg-yellow-400"
        : "bg-red-500";
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="mt-2 h-2 w-full border border-forge-border bg-forge-bg">
      <div
        className={`h-full transition-all duration-150 ${bg}`}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export default function CalculatePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadMsgIndex, setLoadMsgIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") {
      setForm(initialForm());
      try {
        sessionStorage.removeItem(STORAGE_RESULT_KEY);
        sessionStorage.removeItem(SESSION_TRAINING_DAYS_KEY);
      } catch {
        /* ignore */
      }
      window.history.replaceState({}, "", "/calculate");
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadProgress(0);
      setLoadMsgIndex(0);
      return;
    }
    const start = Date.now();
    const totalMs = 8000;
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      setLoadProgress(Math.min(95, (elapsed / totalMs) * 100));
    }, 40);
    return () => clearInterval(tick);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoadMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(id);
  }, [loading]);

  const liveScores = useMemo((): Record<EventKey, number | null> => {
    const out = {} as Record<EventKey, number | null>;
    for (const key of EVENT_ORDER) {
      const raw = parseEventRaw(key, form[key]);
      out[key] =
        raw === null
          ? null
          : scoreEvent(key, form.ageGroup, form.gender, raw);
    }
    return out;
  }, [form]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const scores: Record<EventKey, number> = {} as Record<EventKey, number>;
    for (const key of EVENT_ORDER) {
      const raw = parseEventRaw(key, form[key]);
      if (raw === null) {
        const hint = TIMED_EVENTS.has(key)
          ? "Enter a valid time (MM:SS, e.g. 1:29)"
          : "Enter a valid number";
        setError(`${hint} for ${EVENT_LABELS[key]}.`);
        return;
      }
      scores[key] = raw;
    }

    setLoading(true);
    setLoadProgress(0);
    let leaveSpinnerOn = false;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup: form.ageGroup,
          gender: form.gender,
          scores,
        }),
      });
      const data = (await res.json()) as AnalyzeResponseBody & {
        error?: string;
      };
      if (!res.ok) {
        sessionStorage.setItem(
          STORAGE_RESULT_KEY,
          JSON.stringify({
            analyzeError: true,
            message: data.error ?? "Analysis failed.",
          })
        );
        setLoadProgress(100);
        leaveSpinnerOn = true;
        router.push("/results");
        return;
      }
      sessionStorage.setItem(STORAGE_NEW_RUN_FLAG, "1");
      try {
        sessionStorage.removeItem(SESSION_TRAINING_DAYS_KEY);
      } catch {
        /* ignore */
      }
      sessionStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(data));
      setLoadProgress(100);
      leaveSpinnerOn = true;
      router.push("/results");
    } catch {
      sessionStorage.setItem(
        STORAGE_RESULT_KEY,
        JSON.stringify({
          analyzeError: true,
          message: "Network error. Try again.",
        })
      );
      setLoadProgress(100);
      leaveSpinnerOn = true;
      router.push("/results");
    } finally {
      if (!leaveSpinnerOn) setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {loading ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0a] px-6"
          role="status"
          aria-live="polite"
        >
          <p className="font-heading text-2xl sm:text-3xl text-white tracking-wide text-center max-w-md">
            {LOADING_MESSAGES[loadMsgIndex]}
          </p>
          <div className="mt-10 w-full max-w-md h-3 border border-forge-border bg-forge-bg overflow-hidden">
            <div
              className="h-full bg-forge-accent transition-[width] duration-100 ease-linear"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      <SiteHeader />

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-2xl mx-auto w-full">
        <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
          Score entry
        </h1>
        <p className="mt-2 text-neutral-500 text-sm">
          Values update pass/fail coloring live. All fields required to analyze.
        </p>

        <form onSubmit={onAnalyze} className="mt-10 space-y-8">
          <div className="border border-forge-border bg-forge-panel p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
                  Age group
                </label>
                <select
                  value={form.ageGroup}
                  onChange={(e) =>
                    setField("ageGroup", e.target.value as AgeGroup)
                  }
                  className="mt-3 w-full border border-forge-border bg-forge-bg px-3 py-3 text-white outline-none focus:border-forge-accent"
                >
                  {AGE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setField("gender", e.target.value as Gender)
                  }
                  className="mt-3 w-full border border-forge-border bg-forge-bg px-3 py-3 text-white outline-none focus:border-forge-accent"
                >
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {EVENT_ORDER.map((key) => {
            const meta = FIELD_META[key];
            const sc = liveScores[key];
            return (
              <div
                key={key}
                className="border border-forge-border bg-forge-panel p-4 sm:p-6"
              >
                <label className="block text-sm font-medium text-neutral-200">
                  {EVENT_LABELS[key]}{" "}
                  <span className="text-neutral-500">({meta.unit})</span>
                </label>
                <input
                  type="text"
                  inputMode={meta.inputMode ?? "decimal"}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="mt-2 w-full border border-forge-border bg-forge-bg px-3 py-3 text-white outline-none focus:border-forge-accent"
                  placeholder={TIMED_EVENTS.has(key) ? "0:00" : "—"}
                  autoComplete="off"
                />
                {sc != null ? (
                  <>
                    <div className="mt-2 flex justify-between text-xs text-neutral-500">
                      <span>Event score (0–100)</span>
                      <span
                        className={
                          progressTone(sc) === "green"
                            ? "text-forge-accent"
                            : progressTone(sc) === "yellow"
                              ? "text-yellow-400"
                              : "text-red-400"
                        }
                      >
                        {sc.toFixed(1)}
                      </span>
                    </div>
                    <ProgressBar score={sc} />
                  </>
                ) : (
                  <div className="mt-2 h-2 w-full border border-forge-border bg-forge-bg" />
                )}
              </div>
            );
          })}

          {error && (
            <p className="text-sm text-red-400 border border-red-900/50 bg-red-950/30 px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-forge-accent bg-forge-accent py-4 font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
