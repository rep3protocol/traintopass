import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({
      challenge: null,
      completion: null,
      completedCount: 0,
    });
  }

  const session = await auth();
  const sql = neon(url);
  const today = utcToday();

  type ChallengeRow = {
    id: string;
    challenge_date: string;
    title: string;
    description: string;
    event_type: string;
    target_reps: number | null;
    target_time_seconds: number | null;
  };

  let challenge: ChallengeRow | null = null;

  try {
    const rows = (await sql`
      SELECT
        id::text,
        challenge_date::text,
        title,
        description,
        event_type,
        target_reps,
        target_time_seconds
      FROM daily_challenges
      WHERE challenge_date = ${today}::date
      LIMIT 1
    `) as ChallengeRow[];
    challenge = rows[0] ?? null;
  } catch {
    challenge = null;
  }

  let completion: { result: string | null; completed_at: string | null } | null =
    null;
  let completedCount = 0;
  if (session?.user?.id && challenge) {
    try {
      const cr = (await sql`
        SELECT result, completed_at::text
        FROM challenge_completions
        WHERE user_id = ${session.user.id}::uuid
          AND challenge_id = ${challenge.id}::uuid
        LIMIT 1
      `) as { result: string | null; completed_at: string | null }[];
      completion = cr[0] ?? null;
    } catch {
      completion = null;
    }
  }
  if (challenge) {
    try {
      const cnt = (await sql`
        SELECT COUNT(*)::int AS c
        FROM challenge_completions
        WHERE challenge_id = ${challenge.id}::uuid
      `) as { c: number }[];
      completedCount = Number(cnt[0]?.c ?? 0);
    } catch {
      completedCount = 0;
    }
  }

  return NextResponse.json({
    challenge,
    completion,
    completedCount,
  });
}
