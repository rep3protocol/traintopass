"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { estimateAftReadiness } from "@/lib/aft-readiness";
import type { EnlistmentComponent, EnlistmentStored } from "@/lib/enlistment-types";
import { ENLISTMENT_FREE_PHASE1_MARKDOWN } from "@/lib/enlistment-free-preview";
import {
  LS_ENLISTMENT_PLAN_KEY,
  STORAGE_UNLOCK_KEY,
} from "@/lib/storage-keys";

const COMPONENTS: EnlistmentComponent[] = [
  "Active Duty",
  "Army Reserve",
  "National Guard",
];

function btnSelectClass(active: boolean): string {
  return [
    "border px-4 py-4 text-left text-sm transition-colors w-full sm:w-auto min-h-[3.5rem] flex items-center",
    active
      ? "border-forge-accent bg-forge-accent/10 text-forge-accent"
      : "border-forge-border bg-forge-bg text-neutral-300 hover:border-forge-accent/50",
  ].join(" ");
}

export default function EnlistPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [step, setStep] = useState(1);
  const [paid, setPaid] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [component, setComponent] =
    useState<EnlistmentComponent>("Active Duty");
  const [targetDate, setTargetDate] = useState("");
  const [pushups, setPushups] = useState(20);
  const [runMin, setRunMin] = useState(9);
  const [runSec, setRunSec] = useState(0);
  const [limitations, setLimitations] = useState("");
  const [age, setAge] = useState(22);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

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
          router.replace("/enlist");
        }
      })();
    }
  }, [router]);

  const readiness = estimateAftReadiness(
    pushups,
    runMin,
    runSec,
    age,
    gender
  );

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/enlist" }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        window.location.assign(body.url);
      }
    } finally {
      setCheckoutLoading(false);
    }
  }

  function buildBaseStored(): EnlistmentStored {
    return {
      branch: "Army",
      component,
      targetDate: targetDate.trim() ? targetDate.slice(0, 10) : null,
      age,
      gender,
      currentPushups: pushups,
      currentRunMinutes: runMin,
      currentRunSeconds: runSec,
      limitations,
    };
  }

  async function persistLocal(stored: EnlistmentStored) {
    try {
      localStorage.setItem(LS_ENLISTMENT_PLAN_KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  }

  async function saveProfileIfLoggedIn() {
    if (!session?.user) return;
    const s = buildBaseStored();
    try {
      await fetch("/api/enlistment-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: s.branch,
          component: s.component,
          targetDate: s.targetDate,
          age: s.age,
          gender: s.gender,
          currentPushups: s.currentPushups,
          currentRunMinutes: s.currentRunMinutes,
          currentRunSeconds: s.currentRunSeconds,
          limitations: s.limitations,
        }),
      });
    } catch {
      /* silent */
    }
  }

  async function onViewFreePreview() {
    setGenError(null);
    const stored: EnlistmentStored = {
      ...buildBaseStored(),
      markdown: undefined,
      phase1: ENLISTMENT_FREE_PHASE1_MARKDOWN,
      phase2: "",
      phase3: "",
      generatedAt: undefined,
    };
    await persistLocal(stored);
    await saveProfileIfLoggedIn();
    router.push("/enlist/results");
  }

  async function onGeneratePaid() {
    if (!session?.user) {
      setGenError("Sign in to generate your full plan.");
      return;
    }
    setGenError(null);
    setGenLoading(true);
    try {
      const res = await fetch("/api/generate-enlistment-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: "Army",
          component,
          targetDate: targetDate.trim() ? targetDate.slice(0, 10) : null,
          age,
          gender,
          currentPushups: pushups,
          currentRunMinutes: runMin,
          currentRunSeconds: runSec,
          limitations,
        }),
      });
      const data = (await res.json()) as {
        markdown?: string;
        phase1?: string;
        phase2?: string;
        phase3?: string;
        error?: string;
      };
      if (!res.ok) {
        setGenError(data.error ?? "Could not generate plan.");
        return;
      }
      const stored: EnlistmentStored = {
        ...buildBaseStored(),
        markdown: data.markdown ?? "",
        phase1: data.phase1 ?? "",
        phase2: data.phase2 ?? "",
        phase3: data.phase3 ?? "",
        generatedAt: new Date().toISOString(),
      };
      await persistLocal(stored);
      router.push("/enlist/results");
    } catch {
      setGenError("Network error. Try again.");
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-2xl mx-auto w-full space-y-10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forge-accent">
            Pre-enlistment
          </p>
          <h1 className="mt-2 font-heading text-4xl sm:text-5xl text-white tracking-wide">
            Train to Pass — Enlistment Prep
          </h1>
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
            A 12-week path structured for civilians preparing to join the Army.
            Free to start; full access unlocks the complete AI plan.
          </p>
        </div>

        <p className="text-xs text-neutral-600 uppercase tracking-widest">
          Step {step} of 4
        </p>

        {step === 1 ? (
          <section className="space-y-6 border border-forge-border bg-forge-panel p-6">
            <h2 className="font-heading text-2xl text-white tracking-wide text-center">
              WHICH COMPONENT ARE YOU JOINING?
            </h2>
            <div className="grid gap-3">
              {COMPONENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setComponent(c)}
                  className={btnSelectClass(component === c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent mb-2">
                When are you planning to enlist?
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full border-2 border-forge-accent bg-forge-accent py-3 font-body text-sm font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
            >
              Next
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-6 border border-forge-border bg-forge-panel p-6">
            <h2 className="font-heading text-2xl text-white tracking-wide text-center">
              WHERE ARE YOU RIGHT NOW?
            </h2>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent mb-2">
                How many push-ups can you do without stopping?
              </label>
              <input
                type="number"
                min={0}
                max={999}
                value={pushups}
                onChange={(e) => setPushups(Number(e.target.value))}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent mb-2">
                How long does it take you to run 1 mile?
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={runMin}
                  onChange={(e) => setRunMin(Number(e.target.value))}
                  className="w-24 border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
                />
                <span className="text-neutral-500">min</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={runSec}
                  onChange={(e) => setRunSec(Number(e.target.value))}
                  className="w-24 border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
                />
                <span className="text-neutral-500">sec</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent mb-2">
                Any injuries or physical limitations?{" "}
                <span className="text-neutral-600 font-normal">(optional)</span>
              </label>
              <textarea
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                rows={3}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent placeholder:text-neutral-600"
                placeholder="Leave blank if none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border border-forge-border py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:border-forge-accent hover:text-forge-accent transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 border-2 border-forge-accent bg-forge-accent py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
              >
                Next
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-6 border border-forge-border bg-forge-panel p-6">
            <h2 className="font-heading text-2xl text-white tracking-wide text-center">
              TELL US ABOUT YOURSELF
            </h2>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent mb-2">
                Age
              </label>
              <input
                type="number"
                min={17}
                max={100}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent mb-2">
                Gender
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={btnSelectClass(gender === "male")}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={btnSelectClass(gender === "female")}
                >
                  Female
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 border border-forge-border py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:border-forge-accent hover:text-forge-accent transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 border-2 border-forge-accent bg-forge-accent py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
              >
                Next
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-8 border border-forge-border bg-forge-panel p-6">
            <h2 className="font-heading text-xl sm:text-2xl text-white tracking-wide text-center">
              YOUR 12-WEEK ENLISTMENT PREP PLAN
            </h2>

            <div className="rounded border border-forge-border bg-forge-bg/50 p-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Estimated AFT readiness
              </p>
              <p className="font-heading text-3xl text-forge-accent">
                {readiness}%
              </p>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Based on your current push-ups and 1-mile pace vs official
                minimum standards for your age and gender (approximate).
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-forge-border p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-forge-accent">
                  Phase 1 · Weeks 1–4
                </p>
                <p className="mt-2 text-sm text-neutral-200 font-medium">
                  Build the Base — Endurance and foundational strength
                </p>
              </div>
              <div
                className={`relative border border-forge-border p-4 ${!paid ? "overflow-hidden" : ""}`}
              >
                {!paid ? (
                  <div className="pointer-events-none select-none blur-[2px] opacity-40">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-forge-accent">
                      Phase 2 · Weeks 5–8
                    </p>
                    <p className="mt-2 text-sm text-neutral-200">
                      Military Ready — Push-ups, running, carries and AFT-specific
                      movements
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-forge-accent">
                      Phase 2 · Weeks 5–8
                    </p>
                    <p className="mt-2 text-sm text-neutral-200">
                      Military Ready — Push-ups, running, carries and AFT-specific
                      movements
                    </p>
                  </>
                )}
                {!paid ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/85 px-4">
                    <p className="text-xs text-neutral-300 text-center">
                      Unlock Full Plan — $7/mo
                    </p>
                    <button
                      type="button"
                      disabled={checkoutLoading}
                      onClick={handleCheckout}
                      className="border-2 border-forge-accent bg-forge-accent px-4 py-2 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 pointer-events-auto"
                    >
                      {checkoutLoading ? "Loading…" : "Unlock"}
                    </button>
                  </div>
                ) : null}
              </div>
              <div
                className={`relative border border-forge-border p-4 ${!paid ? "overflow-hidden" : ""}`}
              >
                {!paid ? (
                  <div className="pointer-events-none select-none blur-[2px] opacity-40">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-forge-accent">
                      Phase 3 · Weeks 9–12
                    </p>
                    <p className="mt-2 text-sm text-neutral-200">
                      Test Simulation — Practice the actual AFT events and hit your
                      targets
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-forge-accent">
                      Phase 3 · Weeks 9–12
                    </p>
                    <p className="mt-2 text-sm text-neutral-200">
                      Test Simulation — Practice the actual AFT events and hit your
                      targets
                    </p>
                  </>
                )}
                {!paid ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/85 px-4">
                    <p className="text-xs text-neutral-300 text-center">
                      Unlock Full Plan — $7/mo
                    </p>
                    <button
                      type="button"
                      disabled={checkoutLoading}
                      onClick={handleCheckout}
                      className="border-2 border-forge-accent bg-forge-accent px-4 py-2 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 pointer-events-auto"
                    >
                      {checkoutLoading ? "Loading…" : "Unlock"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {paid && session?.user ? (
              <div className="space-y-3">
                {genError ? (
                  <p className="text-sm text-red-400 border border-red-900/50 bg-red-950/30 px-4 py-3">
                    {genError}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={genLoading}
                  onClick={onGeneratePaid}
                  className="w-full border-2 border-forge-accent bg-forge-accent py-4 font-heading text-lg tracking-wide text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
                >
                  {genLoading ? "Generating…" : "Generate My Plan"}
                </button>
              </div>
            ) : null}

            {paid && !session?.user ? (
              <p className="text-sm text-neutral-400 text-center">
                <Link
                  href="/login?callbackUrl=/enlist"
                  className="text-forge-accent hover:underline"
                >
                  Sign in
                </Link>{" "}
                to generate your full 12-week plan.
              </p>
            ) : null}

            {!paid ? (
              <button
                type="button"
                onClick={onViewFreePreview}
                className="w-full border-2 border-forge-border py-4 font-body text-sm font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent hover:bg-forge-accent/10 transition-colors"
              >
                View my plan preview →
              </button>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 border border-forge-border py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:border-forge-accent hover:text-forge-accent transition-colors"
              >
                Back
              </button>
            </div>
          </section>
        ) : null}

        <p className="text-center text-xs text-neutral-600">
          <Link
            href="/dashboard"
            className="text-neutral-500 hover:text-forge-accent"
          >
            ← Dashboard
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
