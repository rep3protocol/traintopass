import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysUtc(isoDate: string, delta: number): string {
  const d = new Date(isoDate + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ days: [] });
  }

  const session = await auth();
  const sql = neon(url);
  const today = utcToday();
  const start = addDaysUtc(today, -6);

  type Row = {
    id: string;
    challenge_date: string;
    title: string;
    description: string;
    event_type: string;
    target_reps: number | null;
    target_time_seconds: number | null;
    completed: boolean;
  };

  let days: Row[] = [];
  try {
    if (session?.user?.id) {
      const raw = (await sql`
        SELECT
          dc.id::text,
          dc.challenge_date::text,
          dc.title,
          dc.description,
          dc.event_type,
          dc.target_reps,
          dc.target_time_seconds,
          (cc.id IS NOT NULL) AS completed
        FROM daily_challenges dc
        LEFT JOIN challenge_completions cc
          ON cc.challenge_id = dc.id
          AND cc.user_id = ${session.user.id}::uuid
        WHERE dc.challenge_date >= ${start}::date
          AND dc.challenge_date <= ${today}::date
        ORDER BY dc.challenge_date DESC
      `) as Row[];
      days = raw;
    } else {
      const raw = (await sql`
        SELECT
          dc.id::text,
          dc.challenge_date::text,
          dc.title,
          dc.description,
          dc.event_type,
          dc.target_reps,
          dc.target_time_seconds,
          false AS completed
        FROM daily_challenges dc
        WHERE dc.challenge_date >= ${start}::date
          AND dc.challenge_date <= ${today}::date
        ORDER BY dc.challenge_date DESC
      `) as Row[];
      days = raw;
    }
  } catch {
    days = [];
  }

  return NextResponse.json({ days });
}
