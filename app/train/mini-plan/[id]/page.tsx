import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanWeekMarkdown } from "@/components/plan-week-markdown";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MINI_PLANS } from "@/lib/mini-plans";

type PageProps = { params: { id: string } };

export default function MiniPlanPage({ params }: PageProps) {
  const plan = MINI_PLANS.find((p) => p.id === params.id);
  if (!plan) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-2xl mx-auto w-full">
        <p className="mb-6">
          <Link
            href="/train"
            className="text-xs font-semibold uppercase tracking-widest text-neutral-500 hover:text-forge-accent transition-colors"
          >
            ← Back to Train
          </Link>
        </p>

        <h1 className="font-heading text-4xl text-white">{plan.title}</h1>
        <p className="text-sm text-neutral-400 mt-2">{plan.subtitle}</p>
        <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
          {plan.duration}
        </p>

        <section className="mt-8 border border-forge-border bg-forge-panel p-4 sm:p-6">
          <PlanWeekMarkdown body={plan.markdown} />
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-heading text-xl text-white">
            Want a plan built around your actual scores?
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Pro members get a custom AI-generated plan targeting their specific
            weak events based on real AFT scores.
          </p>
          <Link
            href="/train"
            className="inline-block w-full text-center border-2 border-forge-accent bg-forge-accent py-3 font-body text-sm font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors sm:w-auto sm:px-8"
          >
            Unlock Custom Plan — $7/mo
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
