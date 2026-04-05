import { neon } from "@neondatabase/serverless";
import { EVENT_LABELS } from "@/lib/aft-scoring";
import { weakestEventKeyFromScores } from "@/lib/award-patches";

export async function getPersonalChallengeLine(
  userId: string
): Promise<string | null> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  const sql = neon(url);
  try {
    const rows = (await sql`
      SELECT event_scores
      FROM score_history
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `) as { event_scores: Record<string, number> | null }[];
    const ev = rows[0]?.event_scores;
    const weak = weakestEventKeyFromScores(ev);
    if (!weak) return null;
    const label = EVENT_LABELS[weak];
    return `Personal add-on (${label}): add 10–15 minutes of focused drill work on your weakest AFT event today.`;
  } catch {
    return null;
  }
}
