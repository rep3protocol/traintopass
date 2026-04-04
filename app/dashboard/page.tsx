import Link from "next/link";
import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EVENT_ORDER, type EventKey } from "@/lib/aft-scoring";
import { isHistoryOverallPass } from "@/lib/history";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

type Row = {
  id: string;
  age_group: string;
  gender: string;
  total_score: number;
  event_scores: Record<string, number>;
  created_at: string | Date;
};

type GeneralProgramRow = {
  created_at: string | Date;
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const paid = await getUserSubscriptionPaid(session.user.id);

  let rows: Row[] = [];
  let generalProgram: GeneralProgramRow | null = null;
  const url = process.env.DATABASE_URL;
  if (url?.trim()) {
    try {
      const sql = neon(url);
      const raw = await sql`
        SELECT id, age_group, gender, total_score, event_scores, created_at
        FROM score_history
        WHERE user_id = ${session.user.id}::uuid
        ORDER BY created_at DESC
        LIMIT 5
      `;
      rows = (raw as Record<string, unknown>[]).map((r) => ({
        id: String(r.id ?? ""),
        age_group: String(r.age_group ?? ""),
        gender: String(r.gender ?? ""),
        total_score: Number(r.total_score ?? 0),
        event_scores:
          r.event_scores && typeof r.event_scores === "object"
            ? (r.event_scores as Record<string, number>)
            : {},
        created_at: r.created_at as string | Date,
      }));
    } catch {
      rows = [];
    }
    try {
      const sql = neon(url);
      const gp = await sql`
        SELECT created_at
        FROM general_program_history
        WHERE user_id = ${session.user.id}::uuid
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const first = (gp as Record<string, unknown>[])[0];
      if (first?.created_at) {
        generalProgram = { created_at: first.created_at as string | Date };
      }
    } catch {
      generalProgram = null;
    }
  }

  const displayName =
    session.user.name?.trim() ||
    session.user.email?.split("@")[0] ||
    "Athlete";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            Dashboard
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            Welcome back,{" "}
            <span className="text-neutral-200">{displayName}</span>
          </p>
          <p className="mt-2 text-xs uppercase tracking-widest text-neutral-600">
            Subscription:{" "}
            <span className={paid ? "text-forge-accent" : "text-neutral-400"}>
              {paid ? "Paid" : "Free"}
            </span>
          </p>
        </div>

        <div>
          <Link
            href="/calculate"
            className="inline-block border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
          >
            Run calculator
          </Link>
        </div>

        <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            GENERAL TRAINING PROGRAM
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            8-week AI program built around your goals and schedule
          </p>
          {generalProgram ? (
            <>
              <p className="text-xs text-neutral-500">
                Last generated:{" "}
                {generalProgram.created_at instanceof Date
                  ? generalProgram.created_at.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : new Date(generalProgram.created_at).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
              </p>
              <Link
                href="/train"
                className="inline-block border border-forge-border bg-forge-bg px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
              >
                View my program →
              </Link>
            </>
          ) : (
            <Link
              href="/train"
              className="inline-block border border-forge-border bg-forge-bg px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
            >
              Build my program →
            </Link>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Recent assessments
          </h2>
          {rows.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Complete a run on the calculator to see your history here.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
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
                  <li key={row.id}>
                    <Link
                      href={`/history/${row.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 border border-forge-border bg-forge-panel px-4 py-3 hover:border-forge-accent/50 transition-colors"
                    >
                      <span className="text-xs text-neutral-400">
                        {dateLabel}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {row.age_group} · {row.gender}
                      </span>
                      <span className="font-heading text-lg text-white">
                        {row.total_score}
                      </span>
                      <span
                        className={
                          pass
                            ? "text-forge-accent uppercase text-[10px] tracking-wider"
                            : "text-red-400 uppercase text-[10px] tracking-wider"
                        }
                      >
                        {pass ? "Pass" : "Fail"}
                      </span>
                      <span className="text-[10px] text-neutral-600 uppercase tracking-wider">
                        View summary →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
