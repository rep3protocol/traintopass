import { neon } from "@neondatabase/serverless";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysUtc(isoDate: string, delta: number): string {
  const d = new Date(isoDate + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Consecutive calendar days (UTC) with a challenge completion, counting back from today or yesterday. */
export async function getChallengeConsecutiveDays(
  userId: string
): Promise<number> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return 0;
  const sql = neon(url);
  let rows: { d: string }[] = [];
  try {
    rows = (await sql`
      SELECT dc.challenge_date::text AS d
      FROM challenge_completions cc
      INNER JOIN daily_challenges dc ON dc.id = cc.challenge_id
      WHERE cc.user_id = ${userId}::uuid
    `) as { d: string }[];
  } catch {
    return 0;
  }
  const dates = new Set(
    rows.map((r) => String(r.d).slice(0, 10))
  );
  let start = utcToday();
  if (!dates.has(start)) {
    start = addDaysUtc(start, -1);
  }
  let count = 0;
  let cur = start;
  while (dates.has(cur)) {
    count += 1;
    cur = addDaysUtc(cur, -1);
  }
  return count;
}

export async function getChallengeCompletionCount(
  userId: string
): Promise<number> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return 0;
  const sql = neon(url);
  try {
    const rows = (await sql`
      SELECT COUNT(*)::int AS c
      FROM challenge_completions
      WHERE user_id = ${userId}::uuid
    `) as { c: number }[];
    return Number(rows[0]?.c ?? 0);
  } catch {
    return 0;
  }
}
