"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PlanWeekMarkdown } from "@/components/plan-week-markdown";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  isGeneralProgramStored,
  type GeneralProgramStored,
} from "@/lib/general-program-types";
import { downloadGeneralProgramPdf } from "@/lib/generate-general-program-pdf";
import { LS_GENERAL_PROGRAM_KEY } from "@/lib/storage-keys";

export default function TrainResultsPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [stored, setStored] = useState<GeneralProgramStored | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LS_GENERAL_PROGRAM_KEY);
      if (!raw) {
        router.replace("/train");
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!isGeneralProgramStored(parsed) || !parsed.markdown.trim()) {
        router.replace("/train");
        return;
      }
      setStored(parsed);
    } catch {
      router.replace("/train");
    }
  }, [router, sessionStatus]);

  if (!stored) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-500 text-sm">
        Loading…
      </div>
    );
  }

  const dateLabel = new Date(stored.generatedAt).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/train"
            className="inline-block border border-forge-border bg-forge-panel px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Program builder
          </Link>
          <Link
            href="/dashboard"
            className="inline-block border border-forge-border bg-forge-panel px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Dashboard
          </Link>
        </div>

        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            Your 8-week program
          </h1>
          <p className="mt-2 text-xs text-neutral-500 uppercase tracking-widest">
            Generated {dateLabel}
          </p>
        </div>

        <section className="border border-forge-border bg-forge-panel p-4 sm:p-6 space-y-3">
          <h2 className="font-heading text-lg text-forge-accent tracking-wide">
            Your selections
          </h2>
          <dl className="grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500 text-xs uppercase tracking-wider">
                Goal
              </dt>
              <dd className="mt-0.5">{stored.goal}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 text-xs uppercase tracking-wider">
                Days / week
              </dt>
              <dd className="mt-0.5">{stored.trainingDays}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 text-xs uppercase tracking-wider">
                Equipment
              </dt>
              <dd className="mt-0.5">{stored.equipment}</dd>
            </div>
            <div>
              <dt className="text-neutral-500 text-xs uppercase tracking-wider">
                Level
              </dt>
              <dd className="mt-0.5">{stored.fitnessLevel}</dd>
            </div>
          </dl>
          {stored.limitations.trim() ? (
            <p className="text-sm text-neutral-400 pt-2 border-t border-forge-border">
              <span className="text-neutral-500">Limitations: </span>
              {stored.limitations.trim()}
            </p>
          ) : null}
        </section>

        <section className="border border-forge-border bg-forge-panel p-4 sm:p-6">
          <PlanWeekMarkdown body={stored.markdown} />
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/train?regenerate=1"
            className="flex-1 text-center border-2 border-forge-border bg-forge-panel py-3 font-body text-sm font-semibold uppercase tracking-widest text-neutral-200 hover:border-forge-accent hover:text-forge-accent transition-colors"
          >
            Regenerate Program
          </Link>
          <button
            type="button"
            onClick={() => downloadGeneralProgramPdf(stored)}
            className="flex-1 border-2 border-forge-accent bg-forge-accent py-3 font-body text-sm font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
          >
            Download Program (PDF)
          </button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
