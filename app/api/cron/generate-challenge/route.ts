import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "claude-haiku-4-5-20251001";

function todayUtcDateString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function tomorrowUtcDateString(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function challengeExistsForDate(
  sql: NeonQueryFunction<false, false>,
  challengeDate: string
): Promise<boolean> {
  const rows = (await sql`
    SELECT 1
    FROM daily_challenges
    WHERE challenge_date = ${challengeDate}::date
    LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

async function generateAndInsertForDate(
  client: Anthropic,
  sql: NeonQueryFunction<false, false>,
  challengeDate: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const prompt = `Generate a single daily PT challenge for soldiers and military recruits. Pick one of these types: push-ups (HRP style, hand-release), running (distance or sprint), plank hold, deadlift (use bodyweight alternatives if no gym), or full body circuit. Return JSON only: { "title", "description", "eventType", "targetReps", "targetTimeSeconds" }. Keep it achievable in 15-30 minutes. Make it specific and motivating. Today's date is ${challengeDate}.`;

  let parsed: {
    title?: string;
    description?: string;
    eventType?: string;
    targetReps?: number | null;
    targetTimeSeconds?: number | null;
  };
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, error: "parse" };
    }
    parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
  } catch {
    return { ok: false, error: "llm" };
  }

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const description =
    typeof parsed.description === "string" ? parsed.description.trim() : "";
  const eventType =
    typeof parsed.eventType === "string" ? parsed.eventType.trim() : "circuit";
  if (!title || !description) {
    return { ok: false, error: "empty" };
  }

  const targetReps =
    typeof parsed.targetReps === "number" && Number.isFinite(parsed.targetReps)
      ? Math.round(parsed.targetReps)
      : null;
  const targetTimeSeconds =
    typeof parsed.targetTimeSeconds === "number" &&
    Number.isFinite(parsed.targetTimeSeconds)
      ? Math.round(parsed.targetTimeSeconds)
      : null;

  try {
    await sql`
      INSERT INTO daily_challenges (
        challenge_date,
        title,
        description,
        event_type,
        target_reps,
        target_time_seconds
      )
      VALUES (
        ${challengeDate}::date,
        ${title},
        ${description},
        ${eventType},
        ${targetReps},
        ${targetTimeSeconds}
      )
      ON CONFLICT (challenge_date) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        event_type = EXCLUDED.event_type,
        target_reps = EXCLUDED.target_reps,
        target_time_seconds = EXCLUDED.target_time_seconds
    `;
  } catch {
    return { ok: false, error: "db" };
  }

  return { ok: true };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  console.log("Authorization header:", authHeader);
  console.log("CRON_SECRET:", process.env.CRON_SECRET);
  if (
    process.env.CRON_SECRET === undefined ||
    process.env.CRON_SECRET === null ||
    String(process.env.CRON_SECRET).trim() === ""
  ) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const token =
    authHeader?.replace("Bearer ", "").trim() ?? "";
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const url = process.env.DATABASE_URL?.trim();
  if (!apiKey || !url) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const sql = neon(url);
  const today = todayUtcDateString();
  const tomorrow = tomorrowUtcDateString();

  const datesToGenerate: string[] = [];
  if (!(await challengeExistsForDate(sql, today))) {
    datesToGenerate.push(today);
  }
  if (!(await challengeExistsForDate(sql, tomorrow))) {
    datesToGenerate.push(tomorrow);
  }

  if (datesToGenerate.length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const client = new Anthropic({ apiKey });
  let lastChallengeDate: string | undefined;

  for (const challengeDate of datesToGenerate) {
    const result = await generateAndInsertForDate(client, sql, challengeDate);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      );
    }
    lastChallengeDate = challengeDate;
  }

  return NextResponse.json({ ok: true, challengeDate: lastChallengeDate });
}
