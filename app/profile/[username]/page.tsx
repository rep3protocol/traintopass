import Link from "next/link";
import { notFound } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { PatchGrid } from "@/components/patch-display";
import { ProgressChart } from "@/components/progress-chart";
import { RankBadge } from "@/components/rank-badge";
import { getUserPatches } from "@/lib/award-patches";
import { mapDbRowToHistoryEntry } from "@/lib/history";
import { parseRankId, rankDisplayGrade, rankName } from "@/lib/ranks";

type Props = { params: { username: string } };

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: Props) {
  const slug = decodeURIComponent(params.username).trim().toLowerCase();
  if (!slug) notFound();

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-500 text-sm px-4">
        Profile unavailable.
      </div>
    );
  }

  const sql = neon(url);
  let userRow: {
    id: string;
    name: string | null;
    profile_public: boolean | null;
    activity_streak: number | null;
    current_rank: string | null;
  } | null = null;

  try {
    const rows = (await sql`
      SELECT
        id::text,
        name,
        profile_public,
        activity_streak,
        current_rank
      FROM users
      WHERE
        trim(
          both '-'
          from regexp_replace(
            lower(trim(coalesce(name, ''))),
            '[^a-z0-9]+',
            '-',
            'g'
          )
        ) = ${slug}
      LIMIT 1
    `) as {
      id: string;
      name: string | null;
      profile_public: boolean | null;
      activity_streak: number | null;
      current_rank: string | null;
    }[];
    userRow = rows[0] ?? null;
  } catch {
    userRow = null;
  }

  if (!userRow?.id) notFound();

  const isPublic = userRow.profile_public !== false;
  if (!isPublic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 bg-forge-bg">
        <p className="font-heading text-xl text-neutral-400 tracking-wide text-center">
          This profile is private
        </p>
        <Link
          href="/"
          className="mt-8 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:underline"
        >
          ← Home
        </Link>
      </div>
    );
  }

  const displayName =
    userRow.name?.trim().split(/\s+/)[0] || "Athlete";

  let assessmentCount = 0;
  let bestScore = 0;
  let historyRows: Parameters<typeof mapDbRowToHistoryEntry>[0][] = [];

  try {
    const cnt = (await sql`
      SELECT COUNT(*)::int AS c
      FROM score_history
      WHERE user_id = ${userRow.id}::uuid
    `) as { c: number }[];
    assessmentCount = Number(cnt[0]?.c ?? 0);
  } catch {
    assessmentCount = 0;
  }

  try {
    const mx = (await sql`
      SELECT MAX(total_score)::int AS m
      FROM score_history
      WHERE user_id = ${userRow.id}::uuid
    `) as { m: number | null }[];
    bestScore = Number(mx[0]?.m ?? 0);
  } catch {
    bestScore = 0;
  }

  try {
    const raw = (await sql`
      SELECT id, age_group, gender, total_score, event_scores, created_at
      FROM score_history
      WHERE user_id = ${userRow.id}::uuid
      ORDER BY created_at ASC
    `) as Parameters<typeof mapDbRowToHistoryEntry>[0][];
    historyRows = raw;
  } catch {
    historyRows = [];
  }

  const history = historyRows.map((row) => mapDbRowToHistoryEntry(row));
  const patches = await getUserPatches(userRow.id);
  const rank = parseRankId(userRow.current_rank ?? undefined);
  const streak = Number(userRow.activity_streak ?? 0);

  return (
    <div className="min-h-screen flex flex-col bg-forge-bg">
      <header className="border-b border-forge-border px-4 sm:px-8 py-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 hover:text-forge-accent"
          >
            Train to Pass
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl text-white tracking-wide">
            {displayName}
          </h1>
          <p className="mt-2 text-xs text-neutral-500 uppercase tracking-widest">
            Public profile
          </p>
        </div>

        <section className="border border-forge-border bg-forge-panel p-6 flex flex-col sm:flex-row sm:items-center gap-6">
          <RankBadge rank={rank} size="large" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">
              Rank
            </p>
            <p className="font-heading text-2xl text-white tracking-wide">
              {rankName(rank)}
              <span className="text-forge-accent">
                {" "}
                — {rankDisplayGrade(rank)}
              </span>
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              🔥 {streak}-day streak
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-forge-border bg-forge-panel p-5">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">
              Assessments completed
            </p>
            <p className="font-heading text-3xl text-white mt-1">
              {assessmentCount}
            </p>
          </div>
          <div className="border border-forge-border bg-forge-panel p-5">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">
              Best AFT score
            </p>
            <p className="font-heading text-3xl text-white mt-1">
              {Math.round(bestScore)}
              <span className="text-forge-accent text-xl"> / 500</span>
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Achievement patches
          </h2>
          <PatchGrid earnedKeys={patches} />
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Score trend
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Total score by assessment number (oldest to newest).
          </p>
          <ProgressChart history={history} labelMode="index" />
        </section>
      </main>
    </div>
  );
}
