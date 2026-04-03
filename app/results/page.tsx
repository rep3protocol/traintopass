"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import {
  EVENT_ORDER,
  formatSecondsAsMmSs,
  type EventKey,
} from "@/lib/aft-scoring";
import type { AnalyzeResponseBody } from "@/lib/analyze-types";

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

const STORAGE_KEY = "aft-forge-result";

function badgeClasses(status: "pass" | "borderline" | "fail") {
  if (status === "pass") return "border-forge-accent text-forge-accent";
  if (status === "borderline")
    return "border-yellow-500 text-yellow-400";
  return "border-red-500 text-red-400";
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
  const [data, setData] = useState<AnalyzeResponseBody | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.replace("/calculate");
      return;
    }
    try {
      setData(JSON.parse(raw) as AnalyzeResponseBody);
    } catch {
      router.replace("/calculate");
    }
  }, [router]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <header className="border-b border-forge-border px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="font-heading text-2xl sm:text-3xl tracking-wide text-white"
        >
          AFT <span className="text-forge-accent">FORGE</span>
        </Link>
        <Link
          href="/calculate"
          className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
        >
          New analysis
        </Link>
      </header>

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
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

        <div className="space-y-4">
          <h2 className="font-heading text-2xl text-white tracking-wide">
            Training plan
          </h2>
          <WeekBlock title="Week 1" body={data.weeks.week1} />
          <WeekBlock title="Week 2" body={data.weeks.week2} />

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
                className="border-2 border-forge-border px-8 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-400 cursor-not-allowed"
                disabled
              >
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
