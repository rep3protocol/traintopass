import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Train to Pass — Army Fitness Test Score Calculator & Training Plans",
  description:
    "Calculate your AFT scores instantly and get a personalized 4-week training plan built around your weakest events. Free for soldiers and military recruits.",
  keywords: [
    "Army fitness test calculator",
    "AFT score calculator",
    "AFT training plan",
    "how to pass the Army fitness test",
    "military fitness test prep",
  ],
  openGraph: {
    title:
      "Train to Pass — Army Fitness Test Score Calculator & Training Plans",
    description:
      "Calculate your AFT scores instantly and get a personalized 4-week training plan built around your weakest events. Free for soldiers and military recruits.",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-8 py-16 sm:py-24 text-center">
        <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl max-w-4xl text-balance leading-[0.95] text-white">
          Know Your Weak Points.{" "}
          <span className="text-forge-accent">Fix Them.</span>
        </h1>
        <p className="mt-8 max-w-xl text-base sm:text-lg text-neutral-400 leading-relaxed">
          Enter your AFT scores. Get a personalized 4-week training plan built
          around your worst events.
        </p>

        <section className="mt-20 w-full max-w-3xl text-left">
          <h2 className="font-heading text-3xl sm:text-4xl text-white tracking-wide text-center">
            HOW IT WORKS
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Enter Your Scores",
                body: "Input your results from all 5 AFT events",
              },
              {
                step: "2",
                title: "Get Your Analysis",
                body: "See exactly which events are passing, borderline, or failing",
              },
              {
                step: "3",
                title: "Train Your Weak Points",
                body: "Get an AI-generated 4-week plan targeting your lowest scores",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="border border-forge-border bg-forge-panel p-6 flex flex-col gap-3"
              >
                <span className="font-heading text-5xl text-forge-accent leading-none">
                  {item.step}
                </span>
                <h3 className="font-body text-sm font-semibold uppercase tracking-widest text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 w-full max-w-4xl text-left">
          <h2 className="font-heading text-3xl sm:text-4xl text-white tracking-wide text-center">
            PRICING
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="border border-forge-border bg-forge-panel p-6 sm:p-8 flex flex-col gap-4">
              <h3 className="font-heading text-2xl text-white tracking-wide">
                FREE
              </h3>
              <ul className="space-y-2 text-sm text-neutral-400 leading-relaxed list-none">
                {[
                  "AFT score calculator",
                  "Pass/fail analysis",
                  "Week 1 & 2 of your training plan",
                  "SDC no-equipment alternatives",
                  "Shareable score card",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-forge-accent shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-2 border-forge-accent bg-forge-panel p-6 sm:p-8 flex flex-col gap-4">
              <h3 className="font-heading text-2xl text-forge-accent tracking-wide">
                $7/MO — FULL ACCESS
              </h3>
              <ul className="space-y-2 text-sm text-neutral-300 leading-relaxed list-none">
                {[
                  "Everything in free",
                  "Full 4-week training plan",
                  "Customized to your training schedule (3–6 days/week)",
                  "PDF download & email delivery",
                  "Unlimited retakes",
                  "Event deep-dives for weak events",
                  "Progress tracker",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-forge-accent shrink-0">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <Link
          href="/calculate"
          className="mt-16 inline-block border-2 border-forge-accent bg-forge-accent px-10 py-4 font-body text-sm font-semibold uppercase tracking-widest text-forge-bg transition-colors hover:bg-transparent hover:text-forge-accent"
        >
          Analyze My Scores
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
