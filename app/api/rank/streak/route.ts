import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import { checkAndAwardPatches } from "@/lib/award-patches";
import { bumpActivityStreakForUser } from "@/lib/activity-streak";
import { parseRankId } from "@/lib/ranks";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({ streak: 0, rank: "E-1" });
  }

  const { streak: outStreak } = await bumpActivityStreakForUser(
    session.user.id
  );

  let currentRank = "E-1";
  try {
    const sql = neon(url);
    const rows = await sql`
      SELECT current_rank FROM users WHERE id = ${session.user.id}::uuid
    `;
    const row = rows[0] as { current_rank?: string | null } | undefined;
    currentRank = row?.current_rank
      ? String(row.current_rank)
      : parseRankId(undefined);
  } catch {
    /* silent */
  }

  let newPatches: string[] = [];
  try {
    newPatches = await checkAndAwardPatches(session.user.id, {
      streak: outStreak,
    });
  } catch {
    /* silent */
  }

  return NextResponse.json({
    streak: outStreak,
    rank: parseRankId(currentRank),
    newPatches,
  });
}
