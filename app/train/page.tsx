"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  isGeneralProgramStored,
  type GeneralProgramEquipment,
  type GeneralProgramFitnessLevel,
  type GeneralProgramGoal,
  type GeneralProgramStored,
} from "@/lib/general-program-types";
import {
  LS_GENERAL_PROGRAM_KEY,
  STORAGE_UNLOCK_KEY,
} from "@/lib/storage-keys";

const GOALS: GeneralProgramGoal[] = [
  "Strength",
  "Cardio",
  "Full Military Fitness",
];

const DAYS: (3 | 4 | 5 | 6)[] = [3, 4, 5, 6];

const EQUIPMENT: GeneralProgramEquipment[] = [
  "No equipment",
  "Dumbbells only",
  "Full gym",
];

const LEVELS: GeneralProgramFitnessLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

const LOADING_MESSAGES = [
  "Building your 8-week program...",
  "Structuring training phases...",
  "Balancing volume and recovery...",
  "Almost ready...",
];

function btnSelectClass(active: boolean): string {
  return [
    "border px-3 py-2.5 text-left text-sm transition-colors",
    active
      ? "border-forge-accent bg-forge-accent/10 text-forge-accent"
      : "border-forge-border bg-forge-bg text-neutral-300 hover:border-forge-accent/50",
  ].join(" ");
}

export default function TrainPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [paid, setPaid] = useState(false);
  const [goal, setGoal] = useState<GeneralProgramGoal>("Full Military Fitness");
  const [trainingDays, setTrainingDays] = useState<3 | 4 | 5 | 6>(4);
  const [equipment, setEquipment] =
    useState<GeneralProgramEquipment>("Full gym");
  const [fitnessLevel, setFitnessLevel] =
    useState<GeneralProgramFitnessLevel>("Intermediate");
  const [limitations, setLimitations] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadMsgIndex, setLoadMsgIndex] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedProgram, setHasSavedProgram] = useState(false);

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
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LS_GENERAL_PROGRAM_KEY);
      if (!raw) {
        setHasSavedProgram(false);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setHasSavedProgram(
        isGeneralProgramStored(parsed) && parsed.markdown.trim() !== ""
      );
    } catch {
      setHasSavedProgram(false);
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
          router.replace("/train");
        }
      })();
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("regenerate") !== "1") return;
    try {
      const raw = localStorage.getItem(LS_GENERAL_PROGRAM_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!isGeneralProgramStored(parsed)) return;
      setGoal(parsed.goal);
      setTrainingDays(parsed.trainingDays);
      setEquipment(parsed.equipment);
      setFitnessLevel(parsed.fitnessLevel);
      setLimitations(parsed.limitations);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadProgress(0);
      setLoadMsgIndex(0);
      return;
    }
    const start = Date.now();
    const totalMs = 12000;
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

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/train" }),
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

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!paid) return;
    setError(null);
    setLoading(true);
    setLoadProgress(0);
    let leaveSpinnerOn = false;
    try {
      const res = await fetch("/api/generate-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          trainingDays,
          equipment,
          fitnessLevel,
          limitations,
        }),
      });
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not generate program.");
        return;
      }
      const markdown = data.markdown ?? "";
      const stored: GeneralProgramStored = {
        goal,
        trainingDays,
        equipment,
        fitnessLevel,
        limitations,
        markdown,
        generatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LS_GENERAL_PROGRAM_KEY, JSON.stringify(stored));
      } catch {
        /* ignore */
      }
      if (session?.user) {
        try {
          await fetch("/api/history/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "general_program",
              goal,
              trainingDays,
              equipment,
              fitnessLevel,
              limitations,
              programMarkdown: markdown,
            }),
          });
        } catch {
          /* silent */
        }
      }
      setLoadProgress(100);
      leaveSpinnerOn = true;
      router.push("/train/results");
    } catch {
      setError("Network error. Try again.");
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
          General Training Program
        </h1>
        <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
          An 8-week phased plan built around your goal, schedule, and equipment
          — same subscription as the AFT calculator full plan.
        </p>

        {paid && hasSavedProgram ? (
          <div className="mt-6">
            <Link
              href="/train/results"
              className="inline-block border border-forge-accent bg-forge-panel px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:bg-forge-accent/10 transition-colors"
            >
              View saved program →
            </Link>
          </div>
        ) : null}

        <section className="mt-10 border border-forge-border bg-forge-panel p-4 sm:p-6 space-y-4">
          <h2 className="font-heading text-xl text-forge-accent tracking-wide">
            What you get
          </h2>
          <ul className="space-y-2 text-sm text-neutral-300 leading-relaxed list-none">
            {[
              "Eight weeks structured as Foundation → Build → Intensity → Peak",
              "Each week lists every training day with exercises, sets, reps, and rest",
              "Weekly focus and coaching notes tailored to your equipment and level",
              "Regenerate anytime your schedule or goals change",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-forge-accent shrink-0">—</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {!paid ? (
          <div className="mt-10 relative">
            <div
              className="pointer-events-none select-none opacity-[0.35] blur-[1px]"
              aria-hidden
            >
              <div className="border border-forge-border bg-forge-panel p-4 sm:p-6 space-y-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Questionnaire (full access)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {GOALS.map((g) => (
                    <div key={g} className={btnSelectClass(false)}>
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]/80 border border-forge-border p-6 text-center">
              <p className="text-sm text-neutral-300 max-w-sm leading-relaxed">
                Unlock the questionnaire and AI program builder with Full
                Access.
              </p>
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={handleCheckout}
                className="w-full max-w-sm border-2 border-forge-accent bg-forge-accent py-3 font-body text-sm font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
              >
                {checkoutLoading ? "Loading…" : "Unlock Full Plan — $7/mo"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onGenerate} className="mt-10 space-y-8">
            <div className="border border-forge-border bg-forge-panel p-4 sm:p-6 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
                Goal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={btnSelectClass(goal === g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-forge-border bg-forge-panel p-4 sm:p-6 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
                Training days per week
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTrainingDays(d)}
                    className={btnSelectClass(trainingDays === d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-forge-border bg-forge-panel p-4 sm:p-6 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
                Equipment available
              </label>
              <div className="grid grid-cols-1 gap-2">
                {EQUIPMENT.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => setEquipment(eq)}
                    className={btnSelectClass(equipment === eq)}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-forge-border bg-forge-panel p-4 sm:p-6 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
                Fitness level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setFitnessLevel(lv)}
                    className={btnSelectClass(fitnessLevel === lv)}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-forge-border bg-forge-panel p-4 sm:p-6 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
                Injuries or limitations{" "}
                <span className="text-neutral-600 font-normal">(optional)</span>
              </label>
              <textarea
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                rows={3}
                placeholder="e.g. bad knees, shoulder injury — leave blank if none"
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent placeholder:text-neutral-600"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 border border-red-900/50 bg-red-950/30 px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full border-2 border-forge-accent bg-forge-accent py-4 font-heading text-xl tracking-wide text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              GENERATE MY PROGRAM
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-xs text-neutral-600">
          <Link href="/dashboard" className="text-neutral-500 hover:text-forge-accent">
            ← Dashboard
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
