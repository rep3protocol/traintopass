import { neon } from "@neondatabase/serverless";
import { parseRankId } from "@/lib/ranks";

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateString(d);
}

/** Updates activity streak when user completes an action today (e.g. daily challenge). */
export async function bumpActivityStreakForUser(
  userId: string
): Promise<{ streak: number; rank: string }> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return { streak: 0, rank: "E-1" };

  const sql = neon(url);
  const today = utcDateString(new Date());
  const yday = yesterdayUtc();

  let streak = 0;
  let lastActive: string | null = null;
  let currentRank = "E-1";

  try {
    const rows = await sql`
      SELECT activity_streak, last_active_date, current_rank
      FROM users
      WHERE id = ${userId}::uuid
    `;
    const row = rows[0] as
      | {
          activity_streak?: number | null;
          last_active_date?: string | null;
          current_rank?: string | null;
        }
      | undefined;
    streak = Number(row?.activity_streak ?? 0);
    lastActive =
      row?.last_active_date != null ? String(row.last_active_date) : null;
    currentRank = row?.current_rank
      ? String(row.current_rank)
      : parseRankId(undefined);
  } catch {
    return { streak: 0, rank: "E-1" };
  }

  let nextStreak = streak;
  if (lastActive === today) {
    nextStreak = streak;
  } else if (lastActive === yday) {
    nextStreak = streak < 1 ? 1 : streak + 1;
  } else if (lastActive == null) {
    nextStreak = 1;
  } else {
    nextStreak = 1;
  }

  if (lastActive !== today) {
    try {
      await sql`
        UPDATE users
        SET
          activity_streak = ${nextStreak},
          last_active_date = ${today}::date
        WHERE id = ${userId}::uuid
      `;
    } catch {
      /* silent */
    }
  }

  const outStreak = lastActive === today ? streak : nextStreak;
  return { streak: outStreak, rank: parseRankId(currentRank) };
}
