import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getNeonSql } from "@/lib/db";
import type { AgeGroup } from "@/lib/aft-scoring";
import { AGE_GROUPS } from "@/lib/aft-scoring";

function isAgeGroup(s: string): s is AgeGroup {
  return (AGE_GROUPS as string[]).includes(s);
}

export async function POST(req: Request) {
  const sql = getNeonSql();
  if (!sql) {
    return NextResponse.json({ ok: true, skipped: true });
  }

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
    await sql`
      INSERT INTO leaderboard (age_group, gender, total_score)
      VALUES (${ageGroup}, ${gender}, ${totalScore})
    `;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
