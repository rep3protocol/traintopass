"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  EVENT_ORDER,
  formatSecondsAsMmSs,
  type EventKey,
} from "@/lib/aft-scoring";
import {
  isAnalyzeError,
  type AnalyzeResponseBody,
  type ResultsStored,
} from "@/lib/analyze-types";
import { downloadTrainingPlanPdf } from "@/lib/generate-plan-pdf";
import { appendHistoryFromResult, clearHistory, readHistory, type HistoryEntry } from "@/lib/history";
import {
  LS_FREE_RESULTS_EMAIL_KEY,
  LS_PLAN_EMAIL_KEY,
  STORAGE_NEW_RUN_FLAG,
  STORAGE_RESULT_KEY,
  STORAGE_UNLOCK_KEY,
} from "@/lib/storage-keys";

function isTimedEvent(key: EventKey): boolean {
  return key === "sdc" || key === "plk" || key === "twoMR";
}

function formatRawDisplay(key: EventKey, raw: number): string {
  if (isTimedEvent(key)) return formatSecondsAsMmSs(raw);
  return String(raw);
}

function genderLabel(g: AnalyzeResponseBody["gender"] | undefined): string {
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  return "—";
}

function badgeClasses(status: "pass" | "borderline" | "fail") {
  if (status === "pass") return "border-forge-accent text-forge-accent";
  if (status === "borderline")
    return "border-yellow-500 text-yellow-400";
  return "border-red-500 text-red-400";
}

function statusBadgeLabel(status: "pass" | "borderline" | "fail"): string {
  if (status === "pass") return "PASS";
  if (status === "borderline") return "BORDERLINE";
  return "FAIL";
}

function WeekBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="border border-forge-border bg-forge-panel p-4 sm:p-6">
      <h3 className="font-heading text-2xl text-forge-accent tracking-wide">
        {title}
      </h3>
      <div className="mt-4 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
        {body || "—"}
      </div>
    </section>
  );
}

const SDC_NO_EQUIP_ALTS: { name: string; description: string }[] = [
  {
    name: "Broad Jump Sprints",
    description:
      "5 x 25m all-out sprints with 30 sec rest between sets. Replaces the sprint lanes.",
  },
  {
    name: "Towel Rows",
    description:
      "Loop a towel under a door, lean back and row explosively. 3 x 15 reps. Replaces the sled drag.",
  },
  {
    name: "Lateral Shuffle",
    description:
      "5 x 10m side shuffles, touch the ground at each end. Replaces the lateral lane.",
  },
  {
    name: "Farmer Carry (Backpack Loaded)",
    description:
      "Fill a backpack with ~40 lbs of books or water. Walk 25m fast for 5 rounds. Replaces the kettlebell carry.",
  },
  {
    name: "Burpee Broad Jumps",
    description:
      "3 x 10 reps. Full body explosive power for the final sprint lane.",
  },
];

function SdcNoEquipmentAltSection() {
  return (
    <section className="sm:col-span-2 border border-[#2a2a2a] bg-[#161616] px-3 py-2 sm:px-4 sm:py-3">
      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider border border-[#facc15] text-[#facc15] px-2 py-0.5">
        NO EQUIPMENT ALT
      </span>
      <h3 className="font-heading text-xl text-white tracking-wide mt-2">
        No Equipment? Train This Instead
      </h3>
      <p className="text-xs text-neutral-500 mt-1 leading-snug">
        No sled or kettlebells? These substitutes hit the same movement patterns.
      </p>
      <ul className="mt-3 space-y-2">
        {SDC_NO_EQUIP_ALTS.map((item) => (
          <li key={item.name} className="text-sm">
            <span className="font-semibold text-neutral-100">{item.name}</span>
            <p className="text-xs text-neutral-500 mt-0.5 leading-snug">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const leaderboardSent = useRef(false);

  const [stored, setStored] = useState<ResultsStored | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [planEmail, setPlanEmail] = useState("");
  const [planEmailSubmitting, setPlanEmailSubmitting] = useState(false);
  const [planGateDone, setPlanGateDone] = useState(false);
  const [freeEmail, setFreeEmail] = useState("");
  const [freeSubmitting, setFreeSubmitting] = useState(false);
  const [freeDone, setFreeDone] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const data: AnalyzeResponseBody | null =
    stored && !isAnalyzeError(stored) ? stored : null;
  const errorPayload = stored && isAnalyzeError(stored) ? stored : null;

  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem(LS_PLAN_EMAIL_KEY);
      if (savedPlan && savedPlan.trim() !== "") {
        setPlanGateDone(true);
      }
      const freeSaved = localStorage.getItem(LS_FREE_RESULTS_EMAIL_KEY);
      if (freeSaved && freeSaved.trim() !== "") {
        setFreeDone(true);
      }
    } catch {
      /* ignore */
    }
    setHistory(readHistory());
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_RESULT_KEY);
    if (!raw) {
      router.replace("/calculate");
      return;
    }
    let parsed: ResultsStored;
    try {
      parsed = JSON.parse(raw) as ResultsStored;
    } catch {
      router.replace("/calculate");
      return;
    }
    setStored(parsed);

    if (isAnalyzeError(parsed)) {
      return;
    }

    if (sessionStorage.getItem(STORAGE_NEW_RUN_FLAG) === "1") {
      appendHistoryFromResult(parsed);
      sessionStorage.removeItem(STORAGE_NEW_RUN_FLAG);
      setHistory(readHistory());
    }

    if (sessionStorage.getItem(STORAGE_UNLOCK_KEY) === "true") {
      setUnlocked(true);
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const unlockedParam = params.get("unlocked");
    if (sessionId && unlockedParam === "true") {
      void (async () => {
        try {
          const res = await fetch("/api/verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const json = (await res.json()) as { unlocked?: boolean };
          if (json.unlocked) {
            sessionStorage.setItem(STORAGE_UNLOCK_KEY, "true");
            setUnlocked(true);
          }
        } finally {
          router.replace("/results");
        }
      })();
    }
  }, [router]);

  useEffect(() => {
    if (!data || leaderboardSent.current) return;
    leaderboardSent.current = true;
    void fetch("/api/leaderboard/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ageGroup: data.ageGroup,
        gender: data.gender,
        totalScore: data.totalScore,
      }),
    }).catch(() => {});
  }, [data]);

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
      });
      if (!res.ok) {
        return;
      }
      const body = (await res.json()) as { url?: string; error?: string };
      if (body.url) {
        window.location.assign(body.url);
      }
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handlePlanEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const em = planEmail.trim();
    if (!em) return;
    setPlanEmailSubmitting(true);
    try {
      const res = await fetch("/api/send-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, plan: data }),
      });
      if (!res.ok) return;
      try {
        localStorage.setItem(LS_PLAN_EMAIL_KEY, em);
      } catch {
        /* ignore */
      }
      setPlanGateDone(true);
    } finally {
      setPlanEmailSubmitting(false);
    }
  }

  async function handleFreeEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const em = freeEmail.trim();
    if (!em) return;
    setFreeSubmitting(true);
    try {
      const res = await fetch("/api/send-free-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, result: data }),
      });
      if (!res.ok) return;
      try {
        localStorage.setItem(LS_FREE_RESULTS_EMAIL_KEY, em);
      } catch {
        /* ignore */
      }
      setFreeDone(true);
    } finally {
      setFreeSubmitting(false);
    }
  }

  async function handleShareScore() {
    const el = shareCardRef.current;
    if (!el) return;
    setShareBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: "#0a0a0a",
        scale: 1,
        width: 1080,
        height: 1080,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-aft-score.png";
      a.click();
    } finally {
      setShareBusy(false);
    }
  }

  if (!stored) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-500 text-sm">
        Loading…
      </div>
    );
  }

  if (errorPayload) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 max-w-lg mx-auto w-full text-center">
          <div className="border border-forge-border bg-forge-panel p-8 w-full space-y-6">
            <h1 className="font-heading text-3xl sm:text-4xl text-white tracking-wide">
              Something went wrong
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              We couldn&apos;t generate your plan right now. Try again in a
              moment.
            </p>
            <Link
              href="/calculate?reset=1"
              className="inline-block border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
            >
              Try Again
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const showPaidWeeks =
    unlocked && planGateDone;
  const showPlanEmailGate = unlocked && !planGateDone;

  return (
    <div className="min-h-screen flex flex-col pb-8">
      <SiteHeader />

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/calculate?reset=1"
            className="inline-block border border-forge-border bg-forge-panel px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Retake Test
          </Link>
        </div>

        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            Results
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            <span className="text-neutral-500">Gender:</span>{" "}
            {genderLabel(data.gender)}
            <span className="mx-3 text-forge-border">|</span>
            <span className="text-neutral-500">Age group:</span>{" "}
            {data.ageGroup ?? "—"}
          </p>
          <div className="mt-6 border border-forge-border bg-forge-panel p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Total score
              </p>
              <p className="font-heading text-5xl text-white mt-1">
                {data.totalScore}
                <span className="text-forge-accent text-3xl"> / 500</span>
              </p>
              <p className="mt-2 text-xs text-neutral-500 leading-relaxed max-w-md">
                Five events, up to 100 points each. You need at least 60 points on
                every event to pass the AFT overall.
              </p>
            </div>
            <div
              className={`text-sm font-semibold uppercase tracking-widest border px-4 py-2 ${
                data.overallPassed
                  ? "border-forge-accent text-forge-accent"
                  : "border-red-500 text-red-400"
              }`}
            >
              {data.overallPassed ? "Overall pass" : "Overall fail"}
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => void handleShareScore()}
              disabled={shareBusy}
              className="border-2 border-forge-accent px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent bg-forge-panel hover:bg-forge-bg/80 disabled:opacity-50 transition-colors"
            >
              {shareBusy ? "Preparing…" : "Share My Score"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-heading text-2xl text-white tracking-wide">
            By event
          </h2>
          <div className="grid grid-flow-dense gap-4 sm:grid-cols-2">
            {EVENT_ORDER.map((key) => {
              const ev = data.events.find((e) => e.key === key);
              if (!ev) return null;
              return (
                <Fragment key={ev.key}>
                  <div className="border border-forge-border bg-forge-panel p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-neutral-200 leading-snug">
                        {ev.label}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] uppercase tracking-wider border px-2 py-1 ${badgeClasses(
                          ev.status
                        )}`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-neutral-500">
                        Raw: {formatRawDisplay(ev.key, ev.raw)}
                      </span>
                      <span
                        className={`font-heading text-3xl ${
                          ev.passed ? "text-forge-accent" : "text-red-400"
                        }`}
                      >
                        {ev.score}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600">
                      {ev.passed
                        ? "Meets 60-point minimum for this event"
                        : "Below 60-point minimum for this event"}
                    </p>
                  </div>
                  {ev.key === "sdc" ? <SdcNoEquipmentAltSection /> : null}
                </Fragment>
              );
            })}
          </div>
        </div>

        {!unlocked && !freeDone ? (
          <div className="border border-forge-border bg-forge-panel p-5 sm:p-6 space-y-4">
            <h3 className="font-heading text-xl text-white tracking-wide">
              Want your results in your inbox?
            </h3>
            <p className="text-xs text-neutral-500">
              We&apos;ll email you your score breakdown — free.
            </p>
            <form
              onSubmit={(e) => void handleFreeEmailSubmit(e)}
              className="flex flex-col sm:flex-row gap-3 sm:items-end"
            >
              <div className="flex-1">
                <label className="sr-only" htmlFor="free-email">
                  Email
                </label>
                <input
                  id="free-email"
                  type="email"
                  autoComplete="email"
                  value={freeEmail}
                  onChange={(e) => setFreeEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-forge-border bg-forge-bg px-3 py-2.5 text-sm text-white outline-none focus:border-forge-accent"
                />
              </div>
              <button
                type="submit"
                disabled={freeSubmitting}
                className="border-2 border-forge-accent bg-forge-accent px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors shrink-0"
              >
                {freeSubmitting ? "Sending…" : "Send My Results"}
              </button>
            </form>
          </div>
        ) : !unlocked && freeDone ? (
          <p className="text-sm text-forge-accent">Check your inbox!</p>
        ) : null}

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-heading text-2xl text-white tracking-wide">
              Training plan
            </h2>
            <Link
              href="/leaderboard"
              className="text-xs font-medium uppercase tracking-widest text-neutral-500 hover:text-forge-accent transition-colors"
            >
              See where you rank →
            </Link>
          </div>
          <WeekBlock title="Week 1" body={data.weeks.week1} />
          <WeekBlock title="Week 2" body={data.weeks.week2} />

          {showPlanEmailGate ? (
            <div className="border border-forge-border bg-forge-panel p-6 space-y-4">
              <h3 className="font-heading text-xl text-white tracking-wide">
                One last step — where should we send your plan?
              </h3>
              <form
                onSubmit={(e) => void handlePlanEmailSubmit(e)}
                className="space-y-4"
              >
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={planEmail}
                  onChange={(e) => setPlanEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-white outline-none focus:border-forge-accent"
                />
                <button
                  type="submit"
                  disabled={planEmailSubmitting}
                  className="w-full sm:w-auto border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
                >
                  {planEmailSubmitting ? "Sending…" : "Send My Plan & Unlock"}
                </button>
              </form>
            </div>
          ) : null}

          {showPaidWeeks ? (
            <>
              <WeekBlock
                title="Week 3 & 4"
                body={`${data.weeks.week3}\n\n${data.weeks.week4}`}
              />
              <button
                type="button"
                onClick={() => downloadTrainingPlanPdf(data)}
                className="border-2 border-[#4ade80] bg-[#4ade80] px-8 py-3 text-xs font-semibold uppercase tracking-widest text-black"
              >
                ⬇ Download Full Plan (PDF)
              </button>
            </>
          ) : null}

          {!showPaidWeeks && !showPlanEmailGate ? (
            <div className="relative border border-forge-border bg-forge-panel overflow-hidden">
              <div className="p-4 sm:p-6 blur-md select-none pointer-events-none opacity-40">
                <h3 className="font-heading text-2xl text-forge-accent tracking-wide">
                  Week 3 &amp; 4
                </h3>
                <div className="mt-4 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {data.weeks.week3}
                  {"\n\n"}
                  {data.weeks.week4}
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-forge-bg/80 px-6 text-center">
                <div className="max-w-sm space-y-2">
                  <p className="font-heading text-xl sm:text-2xl text-white tracking-wide">
                    Unlock Week 3 &amp; 4 — $7/mo
                  </p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Full 4-week breakdown · PDF export · Yours to keep
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCheckout()}
                  disabled={checkoutLoading}
                  className="border-2 border-forge-border px-8 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 disabled:cursor-not-allowed"
                >
                  {checkoutLoading ? "Loading…" : "Unlock Full Plan — $7/mo"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <section className="space-y-4 pt-4 border-t border-forge-border">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-xl text-white tracking-wide">
              Past Results
            </h2>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-neutral-600">
              Your last five runs will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((h, idx) => {
                const pass =
                  Object.values(h.eventScores).every((s) => s >= 60);
                return (
                  <li
                    key={h.timestamp}
                    className="border border-forge-border bg-forge-panel px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-neutral-400">{h.date}</span>
                      {idx === 0 ? (
                        <span className="text-[10px] uppercase tracking-wider border border-forge-accent text-forge-accent px-1.5 py-0.5">
                          Latest
                        </span>
                      ) : null}
                    </div>
                    <span className="text-neutral-500">
                      {h.ageGroup} · {h.gender}
                    </span>
                    <span className="font-heading text-lg text-white">
                      {h.totalScore}
                    </span>
                    <span
                      className={
                        pass
                          ? "text-forge-accent uppercase text-[10px] tracking-wider"
                          : "text-red-400 uppercase text-[10px] tracking-wider"
                      }
                    >
                      {pass ? "Pass" : "Fail"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              clearHistory();
              setHistory([]);
            }}
            className="text-[11px] text-neutral-600 hover:text-neutral-400 underline underline-offset-2"
          >
            Clear History
          </button>
        </section>
      </main>

      <SiteFooter />

      <div
        ref={shareCardRef}
        className="fixed left-[-10000px] top-0 w-[1080px] h-[1080px] bg-[#0a0a0a] text-white flex flex-col p-14 box-border"
        aria-hidden
      >
        <div className="font-heading text-6xl tracking-[0.2em] text-white text-center">
          TRAIN TO PASS
        </div>
        <div className="mt-10 flex-1 flex flex-col items-center justify-center">
          <p
            className={`font-heading text-[140px] leading-none ${
              data.overallPassed ? "text-[#4ade80]" : "text-red-500"
            }`}
          >
            {Math.round(data.totalScore)}
          </p>
          <p className="mt-4 text-2xl text-neutral-500 uppercase tracking-widest">
            Total · {data.ageGroup} · {genderLabel(data.gender)}
          </p>
        </div>
        <div className="space-y-5 mt-8">
          {EVENT_ORDER.map((key) => {
            const ev = data.events.find((e) => e.key === key);
            if (!ev) return null;
            return (
              <div
                key={key}
                className="flex items-center justify-between border-b border-[#2a2a2a] pb-4 text-xl"
              >
                <span className="text-neutral-300 pr-4 leading-tight max-w-[60%]">
                  {ev.label.replace(" (MDL)", "").replace(" (HRP)", "")}
                </span>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-heading text-4xl text-white">
                    {ev.score}
                  </span>
                  <span
                    className={`text-sm font-bold uppercase tracking-wider border px-2 py-1 ${
                      ev.status === "pass"
                        ? "border-[#4ade80] text-[#4ade80]"
                        : ev.status === "borderline"
                          ? "border-yellow-400 text-yellow-400"
                          : "border-red-500 text-red-400"
                    }`}
                  >
                    {statusBadgeLabel(ev.status)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-auto pt-10 text-center text-neutral-500 text-2xl tracking-widest">
          traintopass.com
        </p>
      </div>
    </div>
  );
}
