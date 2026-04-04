import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EVENT_LABELS, EVENT_ORDER, type EventKey } from "@/lib/aft-scoring";
import { isHistoryOverallPass } from "@/lib/history";

type Props = { params: { id: string } };

export default async function HistorySummaryPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const url = process.env.DATABASE_URL?.trim();
  if (!url) notFound();

  const sql = neon(url);
  let raw: Record<string, unknown>[];
  try {
    raw = await sql`
      SELECT id, age_group, gender, total_score, event_scores, created_at
      FROM score_history
      WHERE id = ${params.id}::uuid AND user_id = ${session.user.id}::uuid
      LIMIT 1
    `;
  } catch {
    notFound();
  }

  const first = raw[0];
  if (!first || typeof first.id !== "string") notFound();

  const row = {
    id: first.id,
    age_group: String(first.age_group ?? ""),
    gender: String(first.gender ?? ""),
    total_score: Number(first.total_score ?? 0),
    event_scores:
      first.event_scores && typeof first.event_scores === "object"
        ? (first.event_scores as Record<string, number>)
        : {},
    created_at: first.created_at as string | Date,
  };

  const evScores = {} as Record<EventKey, number>;
  for (const k of EVENT_ORDER) {
    const v = row.event_scores[k];
    if (typeof v === "number") evScores[k] = v;
  }
  const pass = isHistoryOverallPass(evScores);
  const dateLabel =
    row.created_at instanceof Date
      ? row.created_at.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : new Date(row.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-block border border-forge-border bg-forge-panel px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            Results summary
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            <span className="text-neutral-500">Date:</span> {dateLabel}
            <span className="mx-3 text-forge-border">|</span>
            <span className="text-neutral-500">Age group:</span>{" "}
            {row.age_group}
            <span className="mx-3 text-forge-border">|</span>
            <span className="text-neutral-500">Gender:</span> {row.gender}
          </p>
        </div>

        <div className="border border-forge-border bg-forge-panel p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              Total score
            </p>
            <p className="font-heading text-5xl text-white mt-1">
              {row.total_score}
              <span className="text-forge-accent text-3xl"> / 500</span>
            </p>
          </div>
          <div
            className={`text-sm font-semibold uppercase tracking-widest border px-4 py-2 ${
              pass
                ? "border-forge-accent text-forge-accent"
                : "border-red-500 text-red-400"
            }`}
          >
            {pass ? "Overall pass" : "Overall fail"}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-heading text-2xl text-white tracking-wide">
            By event
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {EVENT_ORDER.map((key) => {
              const score = evScores[key];
              if (score === undefined) return null;
              const evPass = score >= 60;
              return (
                <div
                  key={key}
                  className="border border-forge-border bg-forge-panel p-4 flex flex-col gap-2"
                >
                  <span className="text-sm text-neutral-200 leading-snug">
                    {EVENT_LABELS[key]}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-neutral-500">Points</span>
                    <span
                      className={`font-heading text-3xl ${
                        evPass ? "text-forge-accent" : "text-red-400"
                      }`}
                    >
                      {score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
