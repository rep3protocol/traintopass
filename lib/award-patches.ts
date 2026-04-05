import { neon } from "@neondatabase/serverless";
import { EVENT_ORDER, type EventKey } from "@/lib/aft-scoring";
import { getNeonSql } from "@/lib/db";
import type { PatchKey } from "@/lib/patches";
import { PATCHES } from "@/lib/patches";

export type AwardPatchContext = {
  totalScore?: number;
  eventScores?: Record<string, number>;
  previousAssessmentTotal?: number;
  overallPassed?: boolean;
  /** Total number of score_history rows after the current save */
  assessmentCount?: number;
  streak?: number;
  isGroupLeader?: boolean;
  isGroupMember?: boolean;
  completedGeneralProgram?: boolean;
  completedFullPlan?: boolean;
  leaderboardRank?: number | null;
};

function normalizeGenderLeaderboard(g: string): "male" | "female" | null {
  const t = g.trim().toLowerCase();
  if (t === "male" || t === "female") return t;
  if (g === "Male") return "male";
  if (g === "Female") return "female";
  return null;
}

async function leaderboardRankForUser(
  sql: ReturnType<typeof neon>,
  ageGroup: string,
  genderRaw: string,
  bucketBest: number
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
        AND total_score > ${bucketBest}
    `) as { c: number }[];
    const c = Number(rows[0]?.c ?? 0);
    return c + 1;
  } catch {
    return null;
  }
}

async function loadMergedContext(
  sql: ReturnType<typeof neon>,
  userId: string,
  context: AwardPatchContext
): Promise<AwardPatchContext> {
  const merged: AwardPatchContext = { ...context };
  try {
    const u = (await sql`
      SELECT activity_streak, plan_week_12_viewed
      FROM users
      WHERE id = ${userId}::uuid
    `) as {
      activity_streak?: number | null;
      plan_week_12_viewed?: boolean | null;
    }[];
    const row = u[0];
    if (merged.streak === undefined) {
      merged.streak = Number(row?.activity_streak ?? 0);
    }
    if (merged.completedFullPlan === undefined) {
      merged.completedFullPlan = Boolean(row?.plan_week_12_viewed);
    }
  } catch {
    /* silent */
  }
  if (merged.completedGeneralProgram === undefined) {
    try {
      const gp = (await sql`
        SELECT 1
        FROM general_program_history
        WHERE user_id = ${userId}::uuid
        LIMIT 1
      `) as unknown[];
      merged.completedGeneralProgram = gp.length > 0;
    } catch {
      merged.completedGeneralProgram = false;
    }
  }
  if (merged.leaderboardRank === undefined || merged.leaderboardRank === null) {
    try {
      const list = (await sql`
        SELECT age_group, gender, total_score
        FROM score_history
        WHERE user_id = ${userId}::uuid
        ORDER BY created_at DESC
      `) as {
        age_group?: string;
        gender?: string;
        total_score?: number;
      }[];
      if (list.length === 0) {
        merged.leaderboardRank = null;
      } else {
        let latestAge = "";
        let latestGender = "";
        let bestScore = 0;
        for (const r of list) {
          const ts = Number(r.total_score ?? 0);
          if (ts > bestScore) bestScore = ts;
        }
        if (list[0]) {
          latestAge = String(list[0].age_group ?? "");
          latestGender = String(list[0].gender ?? "");
        }
        let bucketBest = bestScore;
        try {
          const mx = (await sql`
            SELECT MAX(total_score)::int AS m
            FROM score_history
            WHERE user_id = ${userId}::uuid
              AND age_group = ${latestAge}
              AND gender = ${latestGender}
          `) as { m: number | null }[];
          bucketBest = Number(mx[0]?.m ?? bestScore);
        } catch {
          bucketBest = bestScore;
        }
        if (latestAge && latestGender && list.length > 0) {
          merged.leaderboardRank = await leaderboardRankForUser(
            sql,
            latestAge,
            latestGender,
            bucketBest
          );
        } else {
          merged.leaderboardRank = null;
        }
      }
    } catch {
      merged.leaderboardRank = null;
    }
  }
  return merged;
}

export async function awardPatch(
  userId: string,
  patchKey: PatchKey
): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) return false;
  const sql = neon(url);
  try {
    const rows = (await sql`
      INSERT INTO achievement_patches (user_id, patch_key)
      VALUES (${userId}::uuid, ${patchKey})
      ON CONFLICT (user_id, patch_key) DO NOTHING
      RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function checkAndAwardPatches(
  userId: string,
  context: AwardPatchContext = {}
): Promise<PatchKey[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  let merged: AwardPatchContext;
  try {
    merged = await loadMergedContext(sql, userId, context);
  } catch {
    merged = context;
  }
  const awarded: PatchKey[] = [];

  const tryAward = async (key: PatchKey) => {
    if (!(key in PATCHES)) return;
    const ok = await awardPatch(userId, key);
    if (ok) awarded.push(key);
  };

  const ts = merged.totalScore;
  const hasAssessment =
    typeof ts === "number" &&
    Number.isFinite(ts) &&
    merged.eventScores &&
    typeof merged.overallPassed === "boolean";

  if (hasAssessment) {
    const roundTotal = Math.round(ts);
    const ev = merged.eventScores!;
    if (
      typeof merged.assessmentCount === "number" &&
      merged.assessmentCount === 1
    ) {
      await tryAward("first_step");
    }
    if (merged.overallPassed) {
      let allPass = true;
      for (const k of EVENT_ORDER) {
        const v = ev[k];
        if (typeof v !== "number" || v < 60) {
          allPass = false;
          break;
        }
      }
      if (allPass) await tryAward("all_green");
    }
    if (roundTotal === 500) await tryAward("perfect_soldier");
    if (
      typeof merged.previousAssessmentTotal === "number" &&
      roundTotal - merged.previousAssessmentTotal >= 50
    ) {
      await tryAward("most_improved");
    }
  }

  if (typeof merged.streak === "number" && merged.streak >= 30) {
    await tryAward("iron_will");
  }

  if (merged.completedFullPlan) await tryAward("full_send");
  if (merged.completedGeneralProgram) await tryAward("no_excuses");
  if (merged.isGroupLeader === true) await tryAward("unit_leader");
  if (merged.isGroupMember === true) await tryAward("battle_buddy");
  if (merged.leaderboardRank === 1) await tryAward("top_of_the_board");

  return awarded;
}

export async function getUserPatches(userId: string): Promise<PatchKey[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const rows = (await sql`
      SELECT patch_key
      FROM achievement_patches
      WHERE user_id = ${userId}::uuid
      ORDER BY earned_at ASC
    `) as { patch_key: string }[];
    const out: PatchKey[] = [];
    for (const r of rows) {
      const k = r.patch_key;
      if (k in PATCHES) out.push(k as PatchKey);
    }
    return out;
  } catch {
    return [];
  }
}

/** Event key with lowest score from latest history row (for tips). */
export function weakestEventKeyFromScores(
  eventScores: Record<string, number> | null | undefined
): EventKey | null {
  if (!eventScores || typeof eventScores !== "object") return null;
  let worst: EventKey | null = null;
  let worstVal = Infinity;
  for (const k of EVENT_ORDER) {
    const v = eventScores[k];
    if (typeof v === "number" && v < worstVal) {
      worstVal = v;
      worst = k;
    }
  }
  return worst;
}
