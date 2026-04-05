import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ groups: [] });
  }

  const sql = neon(url);
  const uid = session.user.id;

  try {
    const raw = await sql`
      SELECT
        g.id::text,
        g.name,
        g.join_code,
        g.leader_id::text,
        g.aft_test_date,
        g.weekly_challenge_score,
        g.weekly_challenge_set_at,
        u.name AS leader_name,
        u.email AS leader_email,
        (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
      FROM group_members me
      INNER JOIN "groups" g ON g.id = me.group_id
      INNER JOIN users u ON u.id = g.leader_id
      WHERE me.user_id = ${uid}::uuid
      ORDER BY g.created_at ASC
    `;

    const rows = raw as {
      id: string;
      name: string;
      join_code: string;
      leader_id: string;
      aft_test_date: string | null;
      weekly_challenge_score: number | null;
      weekly_challenge_set_at: string | null;
      leader_name: string | null;
      leader_email: string | null;
      member_count: number;
    }[];

    const groups = rows.map((r) => ({
      id: r.id,
      name: r.name,
      joinCode: r.leader_id === uid ? r.join_code : null,
      leaderId: r.leader_id,
      leaderName: r.leader_name?.trim() || r.leader_email?.split("@")[0] || "Leader",
      isLeader: r.leader_id === uid,
      memberCount: Number(r.member_count ?? 0),
      aftTestDate: r.aft_test_date
        ? typeof r.aft_test_date === "string"
          ? r.aft_test_date.slice(0, 10)
          : String(r.aft_test_date).slice(0, 10)
        : null,
      weeklyChallengeScore: r.weekly_challenge_score,
      weeklyChallengeSetAt: r.weekly_challenge_set_at
        ? String(r.weekly_challenge_set_at)
        : null,
    }));

    return NextResponse.json({ groups });
  } catch {
    return NextResponse.json({ groups: [] });
  }
}
