"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PricingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const startProCheckout = async () => {
    setErr(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/pricing" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErr(data.error ?? "Checkout unavailable");
        return;
      }
      window.location.href = data.url;
    } catch {
      setErr("Checkout unavailable");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            PRICING
          </h1>
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
            Individual Pro unlocks plans and tools. Unit add-ons apply when you
            create larger formations. Anyone joining a unit with your code only
            needs a free account.
          </p>
        </div>

        <section className="border border-forge-border bg-forge-panel p-6 space-y-3">
          <h2 className="font-heading text-xl text-forge-accent tracking-wide">
            Individual Pro — $7/mo
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Full training plans, AFT analysis, and the ability to create any unit
            type (squad, platoon, or company). Same Pro features as today —
            nothing removed.
          </p>
          <button
            type="button"
            onClick={() => void startProCheckout()}
            disabled={checkoutLoading}
            className="mt-2 border-2 border-forge-accent bg-forge-accent px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors disabled:opacity-50"
          >
            {checkoutLoading ? "Loading…" : "Unlock Pro — $7/mo"}
          </button>
          {err ? <p className="text-xs text-red-400 pt-2">{err}</p> : null}
        </section>

        <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            What&apos;s included
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
                FREE
              </p>
              <ul className="space-y-2 list-none">
                {[
                  "AFT score calculator (all 5 events)",
                  "Pass/fail analysis",
                  "Leaderboard access",
                  "Public profile",
                  "Workout logger",
                  "Week 1 & 2 of your AFT training plan",
                  "Shareable score card",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-forge-accent shrink-0">—</span>
                    <span className="text-sm text-neutral-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-forge-accent mb-2">
                PRO — $7/MO
              </p>
              <ul className="space-y-2 list-none">
                {[
                  "Everything in free",
                  "Full 4-week AFT training plan targeting weak events",
                  "General 8-week training program (Strength / Cardio / Full Fitness)",
                  "Unlimited program regeneration",
                  "Customized to your schedule (3–6 days/week)",
                  "Score history & progress tracking",
                  "Achievement patches & rank progression (E-1 → General)",
                  "Daily PT challenges",
                  "Squad creation (up to 15 members)",
                  "Enlistment prep 12-week track",
                  "PDF download & email delivery",
                  "Event deep-dives for weak events",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-forge-accent shrink-0">—</span>
                    <span className="text-sm text-neutral-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Unit tiers
          </h2>
          <ul className="space-y-6 text-sm text-neutral-400 leading-relaxed">
            <li>
              <span className="text-forge-accent font-heading text-lg">
                Squad
              </span>
              <span className="text-neutral-500"> — </span>
              Included with Pro ($7/mo). Up to 15 members.
            </li>
            <li>
              <span className="text-forge-accent font-heading text-lg">
                Platoon
              </span>
              <span className="text-neutral-500"> — </span>
              +$15/mo add-on (total $22/mo with Pro). Up to 60 members. Platoon
              leaderboard and shared unit page.
            </li>
            <li>
              <span className="text-forge-accent font-heading text-lg">
                Company
              </span>
              <span className="text-neutral-500"> — </span>
              +$30/mo add-on (total $37/mo with Pro). Up to 250 members. Full
              command suite: Commander Snapshot Dashboard, Event Performance
              Heatmap, At-Risk Roster with action buttons, and automated risk
              detection. Everything a commander needs to track readiness and
              act on it.
            </li>
          </ul>
          <p className="text-xs text-neutral-500 border-t border-forge-border pt-4">
            Add-ons are billed separately on top of your Pro subscription.
            Members joining your unit only need a free account.
          </p>
          <Link
            href="/groups/create"
            className="inline-block border border-forge-border px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
          >
            Create a unit
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
