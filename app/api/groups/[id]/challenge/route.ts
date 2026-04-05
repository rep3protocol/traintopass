import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUuidParam } from "@/lib/group-route-helpers";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const groupId = params.id;
  if (!isUuidParam(groupId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { targetScore?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const targetScore = Number(body.targetScore);
  if (!Number.isFinite(targetScore) || targetScore < 0 || targetScore > 500) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }
  const rounded = Math.round(targetScore);

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const sql = neon(url);
  const uid = session.user.id;

  try {
    const g = await sql`
      SELECT leader_id::text FROM "groups" WHERE id = ${groupId}::uuid LIMIT 1
    `;
    const leaderId = (g as { leader_id: string }[])[0]?.leader_id;
    if (!leaderId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (leaderId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const upd = await sql`
      UPDATE "groups"
      SET
        weekly_challenge_score = ${rounded},
        weekly_challenge_set_at = NOW()
      WHERE id = ${groupId}::uuid AND leader_id = ${uid}::uuid
      RETURNING
        id::text,
        name,
        join_code,
        leader_id::text,
        aft_test_date,
        weekly_challenge_score,
        weekly_challenge_set_at,
        created_at
    `;
    const row = (upd as Record<string, unknown>[])[0];
    if (!row) {
      return NextResponse.json({ error: "Unable to update" }, { status: 503 });
    }

    const cnt = await sql`
      SELECT COUNT(*)::int AS c FROM group_members WHERE group_id = ${groupId}::uuid
    `;
    const memberCount = Number((cnt as { c: number }[])[0]?.c ?? 0);

    return NextResponse.json({
      group: {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        joinCode: String(row.join_code ?? ""),
        leaderId: String(row.leader_id ?? ""),
        aftTestDate: row.aft_test_date
          ? String(row.aft_test_date).slice(0, 10)
          : null,
        weeklyChallengeScore: row.weekly_challenge_score != null
          ? Number(row.weekly_challenge_score)
          : null,
        weeklyChallengeSetAt: row.weekly_challenge_set_at
          ? String(row.weekly_challenge_set_at)
          : null,
        memberCount,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update" }, { status: 503 });
  }
}
