import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getNeonSql } from "@/lib/db";
import { AGE_GROUPS, type AgeGroup } from "@/lib/aft-scoring";

export type LeaderboardRow = {
  id: number;
  age_group: string;
  gender: string;
  total_score: number;
  submitted_at: string;
};

export async function GET(req: Request) {
  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ groups: {} as Record<string, LeaderboardRow[]> });
  }

  const { searchParams } = new URL(req.url);
  const gender = searchParams.get("gender");
  if (gender !== "male" && gender !== "female") {
    return NextResponse.json({ error: "gender required" }, { status: 400 });
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
  } catch {
    return NextResponse.json({ groups: {} });
  }

  const groups: Record<string, LeaderboardRow[]> = {};

  for (const ag of AGE_GROUPS as AgeGroup[]) {
    try {
      const rows = await sql`
        SELECT id, age_group, gender, total_score, submitted_at
        FROM leaderboard
        WHERE gender = ${gender} AND age_group = ${ag}
        ORDER BY total_score DESC, submitted_at ASC
        LIMIT 10
      `;
      groups[ag] = (rows as LeaderboardRow[]).map((r) => ({
        ...r,
        submitted_at:
          typeof r.submitted_at === "string"
            ? r.submitted_at
            : String(r.submitted_at),
      }));
    } catch {
      groups[ag] = [];
    }
  }

  return NextResponse.json({ groups });
}
