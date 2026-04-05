import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import { bumpActivityStreakForUser } from "@/lib/activity-streak";
import { awardPatch, checkAndAwardPatches } from "@/lib/award-patches";
import {
  getChallengeCompletionCount,
  getChallengeConsecutiveDays,
} from "@/lib/challenge-stats";

export const dynamic = "force-dynamic";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { result?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result =
    typeof body.result === "string" ? body.result.trim().slice(0, 500) : "";

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const sql = neon(url);
  const today = utcToday();

  let challengeId: string | null = null;
  try {
    const rows = (await sql`
      SELECT id::text
      FROM daily_challenges
      WHERE challenge_date = ${today}::date
      LIMIT 1
    `) as { id: string }[];
    challengeId = rows[0]?.id ?? null;
  } catch {
    challengeId = null;
  }

  if (!challengeId) {
    return NextResponse.json(
      { error: "No challenge for today" },
      { status: 404 }
    );
  }

  try {
    await sql`
      INSERT INTO challenge_completions (user_id, challenge_id, result)
      VALUES (${session.user.id}::uuid, ${challengeId}::uuid, ${result || null})
      ON CONFLICT (user_id, challenge_id) DO UPDATE SET
        result = EXCLUDED.result,
        completed_at = NOW()
    `;
  } catch {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  const { streak } = await bumpActivityStreakForUser(session.user.id);

  let newPatches: string[] = [];
  try {
    newPatches = await checkAndAwardPatches(session.user.id, { streak });
  } catch {
    /* silent */
  }

  try {
    const consecutive = await getChallengeConsecutiveDays(session.user.id);
    if (consecutive >= 7) {
      const ok = await awardPatch(session.user.id, "daily_warrior");
      if (ok) newPatches.push("daily_warrior");
    }
  } catch {
    /* silent */
  }

  try {
    const total = await getChallengeCompletionCount(session.user.id);
    if (total >= 30) {
      const ok = await awardPatch(session.user.id, "iron_routine");
      if (ok) newPatches.push("iron_routine");
    }
  } catch {
    /* silent */
  }

  return NextResponse.json({
    ok: true,
    streak,
    newPatches,
  });
}
