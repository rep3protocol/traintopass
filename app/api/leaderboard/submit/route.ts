import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { checkAndAwardPatches } from "@/lib/award-patches";
import { getNeonSql } from "@/lib/db";
import type { AgeGroup } from "@/lib/aft-scoring";
import { AGE_GROUPS } from "@/lib/aft-scoring";

function isAgeGroup(s: string): s is AgeGroup {
  return (AGE_GROUPS as string[]).includes(s);
}

function normalizeGenderLeaderboard(g: string): "male" | "female" | null {
  const t = g.trim().toLowerCase();
  if (t === "male" || t === "female") return t;
  return null;
}

export async function POST(req: Request) {
  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  let body: { ageGroup?: string; gender?: string; totalScore?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ageGroup = body.ageGroup;
  const gender = body.gender;
  const totalScore = body.totalScore;

  if (!ageGroup || !isAgeGroup(ageGroup)) {
    return NextResponse.json({ error: "Invalid age group" }, { status: 400 });
  }
  if (gender !== "male" && gender !== "female") {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }
  if (
    typeof totalScore !== "number" ||
    !Number.isFinite(totalScore) ||
    totalScore < 0 ||
    totalScore > 500
  ) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

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
    if (userId) {
      await sql`
        INSERT INTO leaderboard (age_group, gender, total_score, user_id)
        VALUES (${ageGroup}, ${gender}, ${totalScore}, ${userId}::uuid)
      `;
      try {
        const mx = (await sql`
          SELECT MAX(total_score)::float AS m
          FROM score_history
          WHERE user_id = ${userId}::uuid
            AND age_group = ${ageGroup}
            AND gender = ${gender === "male" ? "Male" : "Female"}
        `) as { m: number | null }[];
        const bucketBest = Number(mx[0]?.m ?? totalScore);
        const gNorm = normalizeGenderLeaderboard(gender === "male" ? "male" : "female");
        if (gNorm) {
          const cnt = (await sql`
            SELECT COUNT(*)::int AS c
            FROM leaderboard
            WHERE age_group = ${ageGroup} AND gender = ${gNorm}
              AND total_score > ${bucketBest}
          `) as { c: number }[];
          const rank = Number(cnt[0]?.c ?? 0) + 1;
          if (rank === 1) {
            await checkAndAwardPatches(userId, { leaderboardRank: 1 });
          }
        }
      } catch {
        /* silent */
      }
    } else {
      await sql`
        INSERT INTO leaderboard (age_group, gender, total_score)
        VALUES (${ageGroup}, ${gender}, ${totalScore})
      `;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
