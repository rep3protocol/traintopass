import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "About — Train to Pass",
  description:
    "Train to Pass was built by a National Guard soldier to help soldiers and recruits prepare for the Army Fitness Test.",
  openGraph: {
    title: "About — Train to Pass",
    description:
      "Train to Pass was built by a National Guard soldier to help soldiers and recruits prepare for the Army Fitness Test.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-12 max-w-2xl mx-auto w-full">
        <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
          Built by a Soldier, for Soldiers
        </h1>
        <div className="mt-8 space-y-6 text-sm sm:text-base text-neutral-300 leading-relaxed">
          <p>
            Train to Pass was built by an active National Guard soldier who knows
            firsthand how stressful the AFT can be. This tool exists to give
            every soldier — and every civilian preparing to enlist — a clear
            picture of where they stand and exactly what to work on.
          </p>
          <p>
            No fluff. No generic advice. Just real scores, real analysis, and a
            training plan built around your weakest events.
          </p>
          <p className="text-neutral-500 text-sm">
            Not affiliated with the U.S. Army. Built independently to help
            soldiers train smarter.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
