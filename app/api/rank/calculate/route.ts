import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import {
  computeRawRank,
  effectiveRank,
  getNextRankInfo,
  parseRankId,
  rankName,
  rankTierIndex,
  type RankComputeContext,
  type RankId,
} from "@/lib/ranks";
import { checkAndAwardPatches } from "@/lib/award-patches";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

export const dynamic = "force-dynamic";

function normalizeGenderLeaderboard(g: string): "male" | "female" | null {
  const t = g.trim().toLowerCase();
  if (t === "male" || t === "female") return t;
  if (g === "Male") return "male";
  if (g === "Female") return "female";
  return null;
}

async function leaderboardRankForUser(
  sql: (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>,
  ageGroup: string,
  genderRaw: string,
  bestScore: number
): Promise<number | null> {
  const gender = normalizeGenderLeaderboard(genderRaw);
  if (!gender || !ageGroup.trim()) return null;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        age_group TEXT NOT NULL,
        gender TEXT NOT NULL,
        total_score DOUBLE PRECISION NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    try {
      await sql`
        ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS user_id UUID
      `;
    } catch {
      /* silent */
    }
    const rows = (await sql`
      SELECT COUNT(*)::int AS c
      FROM leaderboard
      WHERE age_group = ${ageGroup} AND gender = ${gender}
        AND total_score > ${bestScore}
    `) as { c: number }[];
    const c = Number(rows[0]?.c ?? 0);
    return c + 1;
  } catch {
    return null;
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({
      rank: "E-1",
      rankName: rankName("E-1"),
      nextRank: "E-2",
      nextRankRequirement: "Complete your first assessment",
      progress: 0,
      rankChanged: false,
    });
  }

  const sql = neon(url);

  let paid = false;
  try {
    paid = await getUserSubscriptionPaid(session.user.id);
  } catch {
    paid = false;
  }

  let assessmentCount = 0;
  let bestScore = 0;
  let latestAge = "";
  let latestGender = "";
  let planWeek12Viewed = false;
  let generalProgramComplete = false;
  let activityStreak = 0;
  let storedRank: RankId = "E-1";

  try {
    const list = (await sql`
      SELECT age_group, gender, total_score
      FROM score_history
      WHERE user_id = ${session.user.id}::uuid
      ORDER BY created_at DESC
    `) as { age_group?: string; gender?: string; total_score?: number }[];
    assessmentCount = list.length;
    for (const r of list) {
      const ts = Number(r.total_score ?? 0);
      if (ts > bestScore) bestScore = ts;
    }
    if (list[0]) {
      latestAge = String(list[0].age_group ?? "");
      latestGender = String(list[0].gender ?? "");
    }
  } catch {
    /* silent */
  }

  try {
    const gp = (await sql`
      SELECT 1
      FROM general_program_history
      WHERE user_id = ${session.user.id}::uuid
      LIMIT 1
    `) as unknown[];
    generalProgramComplete = gp.length > 0;
  } catch {
    generalProgramComplete = false;
  }

  try {
    const u = (await sql`
      SELECT
        plan_week_12_viewed,
        activity_streak,
        current_rank
      FROM users
      WHERE id = ${session.user.id}::uuid
    `) as {
      plan_week_12_viewed?: boolean | null;
      activity_streak?: number | null;
      current_rank?: string | null;
    }[];
    const row = u[0];
    planWeek12Viewed = Boolean(row?.plan_week_12_viewed);
    activityStreak = Number(row?.activity_streak ?? 0);
    storedRank = parseRankId(row?.current_rank ?? undefined);
  } catch {
    /* silent */
  }

  let leaderboardRank: number | null = null;
  if (latestAge && latestGender && assessmentCount > 0) {
    let bucketBest = 0;
    try {
      const mx = (await sql`
        SELECT MAX(total_score)::int AS m
        FROM score_history
        WHERE user_id = ${session.user.id}::uuid
          AND age_group = ${latestAge}
          AND gender = ${latestGender}
      `) as { m: number | null }[];
      bucketBest = Number(mx[0]?.m ?? bestScore);
    } catch {
      bucketBest = bestScore;
    }
    leaderboardRank = await leaderboardRankForUser(
      sql,
      latestAge,
      latestGender,
      bucketBest
    );
  }

  const ctx: RankComputeContext = {
    paid,
    assessmentCount,
    bestScore,
    streak: activityStreak,
    generalProgramComplete,
    planWeek12Viewed,
    leaderboardRank,
  };

  const raw = computeRawRank(ctx);
  const effective = effectiveRank(raw, paid);
  const prevEffective = effectiveRank(storedRank, paid);

  let rankPersisted = false;
  try {
    await sql`
      UPDATE users
      SET
        current_rank = ${effective},
        rank_updated_at = CASE
          WHEN current_rank IS DISTINCT FROM ${effective} THEN NOW()
          ELSE rank_updated_at
        END
      WHERE id = ${session.user.id}::uuid
    `;
    rankPersisted = true;
  } catch {
    /* silent */
  }

  const rankChanged =
    rankPersisted && rankTierIndex(effective) > rankTierIndex(prevEffective);

  const next = getNextRankInfo(effective, ctx);
  const nextId = next.nextRank;

  let newPatches: string[] = [];
  try {
    newPatches = await checkAndAwardPatches(session.user.id, {
      streak: activityStreak,
      leaderboardRank,
    });
  } catch {
    /* silent */
  }

  return NextResponse.json({
    rank: effective,
    rankName: rankName(effective),
    nextRank: nextId,
    nextRankName: nextId ? rankName(nextId) : null,
    nextRankRequirement: next.nextRankRequirement,
    progress: next.progress,
    rankChanged,
    previousRank: rankChanged ? prevEffective : null,
    rawRank: raw,
    newPatches,
  });
}
