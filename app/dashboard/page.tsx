import Link from "next/link";
import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { DashboardRankPanel } from "@/components/dashboard-rank-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EVENT_ORDER, type EventKey } from "@/lib/aft-scoring";
import { isHistoryOverallPass } from "@/lib/history";
import { parseRankId, type RankId } from "@/lib/ranks";
import { slugifyProfileName } from "@/lib/profile-slug";
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

type UnitSummary = {
  id: string;
  name: string;
  memberCount: number;
  aftTestDate: string | null;
};

type EnlistmentSummary = {
  component: string;
  targetDate: string | null;
  maxWeekCompleted: number;
};

function daysUntilDate(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso + "T12:00:00").getTime();
  if (Number.isNaN(t)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(t);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const paid = await getUserSubscriptionPaid(session.user.id);

  let rows: Row[] = [];
  let generalProgram: GeneralProgramRow | null = null;
  let initialRank: RankId = "E-1";
  let initialStreak = 0;
  let unitSummary: UnitSummary | null = null;
  let enlistmentSummary: EnlistmentSummary | null = null;
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
    try {
      const sql = neon(url);
      const ur = await sql`
        SELECT current_rank, activity_streak
        FROM users
        WHERE id = ${session.user.id}::uuid
      `;
      const u0 = (ur as Record<string, unknown>[])[0];
      if (u0) {
        initialRank = parseRankId(String(u0.current_rank ?? ""));
        initialStreak = Number(u0.activity_streak ?? 0);
      }
    } catch {
      /* silent */
    }
    try {
      const sql = neon(url);
      const ug = await sql`
        SELECT
          g.id::text,
          g.name,
          g.aft_test_date,
          (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
        FROM group_members me
        INNER JOIN "groups" g ON g.id = me.group_id
        WHERE me.user_id = ${session.user.id}::uuid
        ORDER BY g.created_at ASC
        LIMIT 1
      `;
      const u0 = (ug as Record<string, unknown>[])[0];
      if (u0?.id) {
        const ad = u0.aft_test_date;
        const aftStr =
          ad != null ? String(ad).slice(0, 10) : null;
        unitSummary = {
          id: String(u0.id),
          name: String(u0.name ?? "Unit"),
          memberCount: Number(u0.member_count ?? 0),
          aftTestDate: aftStr,
        };
      }
    } catch {
      unitSummary = null;
    }
    try {
      const sql = neon(url);
      const ep = await sql`
        SELECT
          ep.component,
          ep.target_date,
          COALESCE(
            (SELECT MAX(p.week_number)::int FROM enlistment_progress p WHERE p.user_id = ep.user_id),
            0
          ) AS max_week_completed
        FROM enlistment_profiles ep
        WHERE ep.user_id = ${session.user.id}::uuid
        LIMIT 1
      `;
      const e0 = (ep as Record<string, unknown>[])[0];
      if (e0?.component != null) {
        const td = e0.target_date;
        enlistmentSummary = {
          component: String(e0.component ?? ""),
          targetDate:
            td != null ? String(td).slice(0, 10) : null,
          maxWeekCompleted: Number(e0.max_week_completed ?? 0),
        };
      }
    } catch {
      enlistmentSummary = null;
    }
  }

  const displayName =
    session.user.name?.trim() ||
    session.user.email?.split("@")[0] ||
    "Athlete";
  const profileSlug = slugifyProfileName(
    session.user.name?.trim() || session.user.email?.split("@")[0] || "user"
  );

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

        <DashboardRankPanel
          paid={paid}
          initialRank={initialRank}
          initialStreak={initialStreak}
        />

        <div>
          <Link
            href={`/profile/${profileSlug}`}
            className="inline-block text-xs font-semibold uppercase tracking-widest text-forge-accent hover:underline"
          >
            View My Profile →
          </Link>
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
            ENLISTMENT PREP
          </h2>
          {enlistmentSummary ? (
            <>
              <p className="text-sm text-neutral-200">
                Army · {enlistmentSummary.component}
              </p>
              {enlistmentSummary.targetDate
                ? (() => {
                    const d = daysUntilDate(enlistmentSummary.targetDate);
                    if (d == null) return null;
                    const label =
                      d < 0
                        ? `${Math.abs(d)} days past target date`
                        : d === 0
                          ? "Target date is today"
                          : `${d} days until target enlistment date`;
                    return (
                      <p
                        className={
                          d < 0
                            ? "text-sm text-neutral-400"
                            : d < 60
                              ? "text-sm text-[#facc15]"
                              : "text-sm text-[#4ade80]"
                        }
                      >
                        {label}
                      </p>
                    );
                  })()
                : null}
              <p className="text-xs text-neutral-500">
                Current focus: Week{" "}
                {Math.min(
                  12,
                  enlistmentSummary.maxWeekCompleted + 1
                )}{" "}
                of 12
              </p>
              <Link
                href="/enlist/results"
                className="inline-block border border-forge-border bg-forge-bg px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
              >
                View my plan →
              </Link>
            </>
          ) : (
            <Link
              href="/enlist"
              className="inline-block text-sm text-forge-accent hover:underline"
            >
              Preparing to enlist? Start here →
            </Link>
          )}
        </section>

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

        <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            MY UNIT
          </h2>
          {unitSummary ? (
            <>
              <p className="text-sm text-neutral-200 font-medium">
                {unitSummary.name}
              </p>
              <p className="text-xs text-neutral-500 uppercase tracking-widest">
                {unitSummary.memberCount} members
              </p>
              {unitSummary.aftTestDate
                ? (() => {
                    const d = daysUntilDate(unitSummary.aftTestDate);
                    if (d == null) return null;
                    const label =
                      d < 0
                        ? `${Math.abs(d)} days since unit AFT date`
                        : d === 0
                          ? "Unit AFT is today"
                          : `${d} days until unit AFT`;
                    return (
                      <p
                        className={
                          d < 0
                            ? "text-sm text-neutral-400"
                            : d < 14
                              ? "text-sm text-[#facc15]"
                              : "text-sm text-forge-accent"
                        }
                      >
                        {label}
                      </p>
                    );
                  })()
                : null}
              <Link
                href={`/groups/${unitSummary.id}`}
                className="inline-block border border-forge-border bg-forge-bg px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
              >
                View unit →
              </Link>
            </>
          ) : (
            <Link
              href="/groups"
              className="inline-block border border-forge-border bg-forge-bg px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
            >
              Join or create a unit →
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
