"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanWeekMarkdown } from "@/components/plan-week-markdown";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { estimateAftReadiness } from "@/lib/aft-readiness";
import type { EnlistmentStored } from "@/lib/enlistment-types";
import { isEnlistmentStored } from "@/lib/enlistment-types";
import { ENLISTMENT_FREE_PHASE1_MARKDOWN } from "@/lib/enlistment-free-preview";
import { downloadEnlistmentPlanPdf } from "@/lib/generate-enlistment-plan-pdf";
import { parseEnlistmentPhases } from "@/lib/parse-enlistment-phases";
import {
  LS_ENLISTMENT_PLAN_KEY,
  STORAGE_UNLOCK_KEY,
} from "@/lib/storage-keys";

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso + "T12:00:00").getTime();
  if (Number.isNaN(t)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(t);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export default function EnlistResultsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [paid, setPaid] = useState(false);
  const [stored, setStored] = useState<EnlistmentStored | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [weekLoading, setWeekLoading] = useState(false);
  const [maxWeekDb, setMaxWeekDb] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(STORAGE_UNLOCK_KEY) === "true") {
        setPaid(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading" || !session?.user) return;
    void (async () => {
      try {
        const res = await fetch("/api/verify-subscription");
        if (!res.ok) return;
        const json = (await res.json()) as { active?: boolean };
        if (!json.active) return;
        setPaid(true);
        try {
          sessionStorage.setItem(STORAGE_UNLOCK_KEY, "true");
        } catch {
          /* ignore */
        }
      } catch {
        /* silent */
      }
    })();
  }, [session, sessionStatus]);

  const mergeFromServer = useCallback((row: Record<string, unknown>) => {
    const plan = row.plan_markdown;
    if (typeof plan !== "string" || !plan.trim()) return;
    const phases = parseEnlistmentPhases(plan);
    const comp = String(row.component ?? "");
    const component: EnlistmentStored["component"] =
      comp === "Army Reserve" || comp === "National Guard"
        ? comp
        : "Active Duty";
    const next: EnlistmentStored = {
      branch: String(row.branch ?? "Army"),
      component,
      targetDate:
        row.target_date != null
          ? String(row.target_date).slice(0, 10)
          : null,
      age: Number(row.age ?? 22),
      gender: row.gender === "female" ? "female" : "male",
      currentPushups: Number(row.current_pushups ?? 0),
      currentRunMinutes: Number(row.current_run_minutes ?? 0),
      currentRunSeconds: Number(row.current_run_seconds ?? 0),
      limitations: String(row.limitations ?? ""),
      markdown: plan,
      phase1: phases.phase1,
      phase2: phases.phase2,
      phase3: phases.phase3,
      generatedAt: new Date().toISOString(),
    };
    setStored(next);
    try {
      localStorage.setItem(LS_ENLISTMENT_PLAN_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LS_ENLISTMENT_PLAN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (isEnlistmentStored(parsed)) {
        setStored(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    void (async () => {
      try {
        const res = await fetch("/api/enlistment-profile");
        if (!res.ok) return;
        const row = (await res.json()) as Record<string, unknown> | null;
        if (!row || typeof row !== "object") return;
        const mw = Number(row.max_week_completed ?? 0);
        if (Number.isFinite(mw)) setMaxWeekDb(mw);
        mergeFromServer(row);
      } catch {
        /* silent */
      }
    })();
  }, [session?.user, mergeFromServer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
            try {
              sessionStorage.setItem(STORAGE_UNLOCK_KEY, "true");
            } catch {
              /* ignore */
            }
            setPaid(true);
          }
        } finally {
          router.replace("/enlist/results");
        }
      })();
    }
  }, [router]);

  const readiness = useMemo(() => {
    if (!stored) return 0;
    return estimateAftReadiness(
      stored.currentPushups,
      stored.currentRunMinutes,
      stored.currentRunSeconds,
      stored.age,
      stored.gender
    );
  }, [stored]);

  const dLeft = stored ? daysUntil(stored.targetDate) : null;

  const phase1Body = useMemo(() => {
    if (!stored) return "";
    if (stored.phase1?.trim()) return stored.phase1;
    if (paid && stored.markdown?.trim()) {
      return parseEnlistmentPhases(stored.markdown).phase1;
    }
    return ENLISTMENT_FREE_PHASE1_MARKDOWN;
  }, [stored, paid]);

  const fullPlanBody = stored?.markdown?.trim() ?? "";

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/enlist/results" }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { url?: string };
      if (body.url) window.location.assign(body.url);
    } finally {
      setCheckoutLoading(false);
    }
  }

  function onDownloadPdf() {
    if (!fullPlanBody) return;
    downloadEnlistmentPlanPdf(
      fullPlanBody,
      `${stored?.component ?? ""}`.replace(/\s+/g, " ").trim()
    );
  }

  function onRetake() {
    try {
      localStorage.removeItem(LS_ENLISTMENT_PLAN_KEY);
    } catch {
      /* ignore */
    }
    router.push("/enlist");
  }

  async function logWeekComplete() {
    if (!session?.user || !stored) return;
    const nextWeek = Math.min(12, maxWeekDb + 1);
    setWeekLoading(true);
    try {
      await fetch("/api/enlistment-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber: nextWeek }),
      });
      setMaxWeekDb(nextWeek);
    } catch {
      /* silent */
    } finally {
      setWeekLoading(false);
    }
  }

  if (!stored) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 px-4 py-16 max-w-xl mx-auto text-center space-y-6">
          <h1 className="font-heading text-3xl text-white tracking-wide">
            No plan yet
          </h1>
          <p className="text-sm text-neutral-400">
            Complete the enlistment prep questionnaire first.
          </p>
          <Link
            href="/enlist"
            className="inline-block border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
          >
            Start prep →
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const countdownClass =
    dLeft == null
      ? "text-neutral-400"
      : dLeft < 60
        ? "text-[#facc15]"
        : "text-[#4ade80]";

  const currentWeek = Math.min(12, maxWeekDb + 1);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div className="border border-forge-border bg-forge-panel p-6 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forge-accent">
            Your profile
          </p>
          <p className="text-sm text-neutral-200">
            <span className="text-neutral-500">Branch:</span> {stored.branch}{" "}
            · <span className="text-neutral-500">Component:</span>{" "}
            {stored.component}
          </p>
          <p className="text-sm text-neutral-200">
            <span className="text-neutral-500">Target date:</span>{" "}
            {stored.targetDate ?? "—"}
          </p>
          {dLeft != null ? (
            <p className={`text-sm font-medium ${countdownClass}`}>
              {dLeft < 0
                ? `${Math.abs(dLeft)} days past your target date`
                : dLeft === 0
                  ? "Target enlistment date is today"
                  : `${dLeft} days until your target enlistment date`}
            </p>
          ) : null}
          <p className="text-sm text-neutral-400 leading-relaxed">
            Based on your current fitness, you&apos;re approximately{" "}
            <span className="text-forge-accent font-heading text-lg">
              {readiness}%
            </span>{" "}
            ready for the AFT (estimate from push-ups and 1-mile pace vs
            minimum standards).
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetake}
            className="border border-forge-border bg-forge-bg px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
          >
            Retake assessment
          </button>
          {paid && fullPlanBody ? (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="border border-forge-accent bg-forge-accent/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:bg-forge-accent hover:text-forge-bg transition-colors"
            >
              Download plan (PDF)
            </button>
          ) : null}
          {session?.user ? (
            <button
              type="button"
              disabled={weekLoading || maxWeekDb >= 12}
              onClick={logWeekComplete}
              className="border border-forge-border px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-neutral-300 hover:border-forge-accent hover:text-forge-accent disabled:opacity-40 transition-colors"
            >
              {weekLoading
                ? "Saving…"
                : maxWeekDb >= 12
                  ? "All 12 weeks logged"
                  : `Log week ${currentWeek} complete`}
            </button>
          ) : null}
        </div>

        <section className="space-y-6">
          <h2 className="font-heading text-2xl text-white tracking-wide">
            Your plan
          </h2>

          <div>
            <p className="text-xs uppercase tracking-widest text-forge-accent mb-3">
              Phase 1 · Weeks 1–4
            </p>
            <div className="border border-forge-border bg-forge-panel p-5">
              <PlanWeekMarkdown body={phase1Body} />
            </div>
          </div>

          {paid && fullPlanBody ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-widest text-forge-accent mb-3">
                  Phase 2 · Weeks 5–8
                </p>
                <div className="border border-forge-border bg-forge-panel p-5">
                  <PlanWeekMarkdown
                    body={
                      stored.phase2?.trim() ||
                      parseEnlistmentPhases(fullPlanBody).phase2
                    }
                  />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-forge-accent mb-3">
                  Phase 3 · Weeks 9–12
                </p>
                <div className="border border-forge-border bg-forge-panel p-5">
                  <PlanWeekMarkdown
                    body={
                      stored.phase3?.trim() ||
                      parseEnlistmentPhases(fullPlanBody).phase3
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="relative border border-forge-border bg-forge-panel p-5 overflow-hidden min-h-[140px]">
                <div className="pointer-events-none select-none blur-[2px] opacity-40">
                  <p className="text-xs uppercase tracking-widest text-forge-accent mb-3">
                    Phase 2 · Weeks 5–8
                  </p>
                  <p className="text-sm text-neutral-300">
                    Military Ready — full daily workouts unlock with Full Plan.
                  </p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/88 px-4">
                  <p className="text-xs text-neutral-300 text-center">
                    Unlock Full Plan — $7/mo
                  </p>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={handleCheckout}
                    className="border-2 border-forge-accent bg-forge-accent px-4 py-2 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50"
                  >
                    {checkoutLoading ? "Loading…" : "Unlock"}
                  </button>
                </div>
              </div>
              <div className="relative border border-forge-border bg-forge-panel p-5 overflow-hidden min-h-[140px]">
                <div className="pointer-events-none select-none blur-[2px] opacity-40">
                  <p className="text-xs uppercase tracking-widest text-forge-accent mb-3">
                    Phase 3 · Weeks 9–12
                  </p>
                  <p className="text-sm text-neutral-300">
                    Test Simulation — AFT event prep unlocks with Full Plan.
                  </p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/88 px-4">
                  <p className="text-xs text-neutral-300 text-center">
                    Unlock Full Plan — $7/mo
                  </p>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={handleCheckout}
                    className="border-2 border-forge-accent bg-forge-accent px-4 py-2 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50"
                  >
                    {checkoutLoading ? "Loading…" : "Unlock"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <p className="text-center text-xs text-neutral-600">
          <Link href="/dashboard" className="text-neutral-500 hover:text-forge-accent">
            ← Dashboard
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
