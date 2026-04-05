import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUuidParam } from "@/lib/group-route-helpers";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

/**
 * Parse YYYY-MM-DD without UTC/local drift from Date#toISOString().
 * Only a strict calendar date string is accepted; used for all writes and DB cleanup.
 */
function parseCalendarDateOnly(raw: string): string | null {
  const s = raw.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(da) ||
    mo < 1 ||
    mo > 12 ||
    da < 1 ||
    da > 31
  ) {
    return null;
  }
  const d = new Date(y, mo - 1, da);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo - 1 ||
    d.getDate() !== da
  ) {
    return null;
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Normalize a DB `aft_test_date` value to canonical YYYY-MM-DD, or null if not a valid calendar date. */
function isoDateFromDbValue(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const head = s.length >= 10 ? s.slice(0, 10) : s;
  return parseCalendarDateOnly(head) ?? parseCalendarDateOnly(s);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let groupId: string | undefined;
  try {
    const params = await Promise.resolve(context.params);
    groupId = params?.id;
  } catch (e) {
    console.error("[api/groups/[id]/test-date] Failed to resolve route params", e);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!groupId || typeof groupId !== "string") {
    console.error("[api/groups/[id]/test-date] Missing group id in URL params", {
      groupId,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isUuidParam(groupId)) {
    console.error("[api/groups/[id]/test-date] Invalid group id format", {
      groupId,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { testDate?: string };
  try {
    body = await req.json();
  } catch (e) {
    console.error("[api/groups/[id]/test-date] Invalid JSON body", e);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const testDate = body.testDate;
  console.log("[api/groups/[id]/test-date] incoming testDate", {
    value: testDate,
    type: typeof testDate,
  });
  if (!testDate || typeof testDate !== "string" || testDate.trim().length === 0) {
    console.error("[api/groups/[id]/test-date] Missing or non-string testDate", {
      bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
    });
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const isoDate = parseCalendarDateOnly(testDate);
  if (!isoDate) {
    console.error("[api/groups/[id]/test-date] testDate not valid YYYY-MM-DD", {
      raw: testDate,
    });
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("[api/groups/[id]/test-date] DATABASE_URL is not set");
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const sql = neon(url);
  const uid = session.user.id;

  try {
    const g = await sql`
      SELECT leader_id::text, aft_test_date
      FROM "groups"
      WHERE id = ${groupId}::uuid
      LIMIT 1
    `;
    const row0 = (g as { leader_id: string; aft_test_date: unknown }[])[0];
    const leaderId = row0?.leader_id;
    if (!leaderId) {
      console.error("[api/groups/[id]/test-date] Group not found", {
        groupId,
      });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (leaderId !== uid) {
      console.error("[api/groups/[id]/test-date] Caller is not group leader", {
        groupId,
        userId: uid,
        leaderId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentAft = row0.aft_test_date;
    if (currentAft != null && isoDateFromDbValue(currentAft) == null) {
      await sql`
        UPDATE "groups"
        SET aft_test_date = NULL
        WHERE id = ${groupId}::uuid AND leader_id = ${uid}::uuid
      `;
    }

    const upd = await sql`
      UPDATE "groups"
      SET aft_test_date = ${isoDate}::date
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
      console.error(
        "[api/groups/[id]/test-date] UPDATE returned no row (check leader_id / group id)",
        { groupId, userId: uid, isoDate }
      );
      return NextResponse.json({ error: "Unable to update" }, { status: 503 });
    }

    const cnt = await sql`
      SELECT COUNT(*)::int AS c FROM group_members WHERE group_id = ${groupId}::uuid
    `;
    const memberCount = Number((cnt as { c: number }[])[0]?.c ?? 0);

    const aftTestDateOut =
      isoDateFromDbValue(row.aft_test_date) ?? isoDate;
    const responseBody = {
      group: {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        joinCode: String(row.join_code ?? ""),
        leaderId: String(row.leader_id ?? ""),
        aftTestDate: aftTestDateOut,
        weeklyChallengeScore: row.weekly_challenge_score != null
          ? Number(row.weekly_challenge_score)
          : null,
        weeklyChallengeSetAt: row.weekly_challenge_set_at
          ? String(row.weekly_challenge_set_at)
          : null,
        memberCount,
      },
    };
    console.log(
      "[api/groups/[id]/test-date] returning",
      JSON.stringify(responseBody)
    );
    return NextResponse.json(responseBody);
  } catch (e) {
    console.error(
      "[api/groups/[id]/test-date] Database error",
      { groupId, isoDate, userId: uid },
      e
    );
    return NextResponse.json({ error: "Unable to update" }, { status: 503 });
  }
}
