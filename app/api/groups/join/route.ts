import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkAndAwardPatches } from "@/lib/award-patches";
import { normalizeJoinCode } from "@/lib/groups";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const MAX_MEMBERS = 20;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const code = normalizeJoinCode(typeof body.code === "string" ? body.code : "");
  if (code.length !== 6) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const sql = neon(url);
  const uid = session.user.id;

  try {
    const found = await sql`
      SELECT id::text, name FROM "groups" WHERE join_code = ${code}
    `;
    const g = (found as { id: string; name: string }[])[0];
    if (!g?.id) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const existing = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${g.id}::uuid AND user_id = ${uid}::uuid
      LIMIT 1
    `;
    if ((existing as unknown[]).length > 0) {
      const cnt = await sql`
        SELECT COUNT(*)::int AS c FROM group_members WHERE group_id = ${g.id}::uuid
      `;
      const c = Number((cnt as { c: number }[])[0]?.c ?? 0);
      return NextResponse.json({ group: { id: g.id, name: g.name, memberCount: c } });
    }

    const countRows = await sql`
      SELECT COUNT(*)::int AS c FROM group_members WHERE group_id = ${g.id}::uuid
    `;
    const n = Number((countRows as { c: number }[])[0]?.c ?? 0);
    if (n >= MAX_MEMBERS) {
      return NextResponse.json({ error: "Unit is full" }, { status: 400 });
    }

    await sql`
      INSERT INTO group_members (group_id, user_id)
      VALUES (${g.id}::uuid, ${uid}::uuid)
    `;
    try {
      await checkAndAwardPatches(uid, { isGroupMember: true });
    } catch {
      /* silent */
    }

    const after = await sql`
      SELECT COUNT(*)::int AS c FROM group_members WHERE group_id = ${g.id}::uuid
    `;
    const memberCount = Number((after as { c: number }[])[0]?.c ?? n + 1);

    return NextResponse.json({
      group: { id: g.id, name: g.name, memberCount },
    });
  } catch {
    return NextResponse.json({ error: "Unable to join" }, { status: 503 });
  }
}
