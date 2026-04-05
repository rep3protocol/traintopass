import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateJoinCode } from "@/lib/groups";
import { checkAndAwardPatches } from "@/lib/award-patches";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paid = await getUserSubscriptionPaid(session.user.id);
  if (!paid) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const sql = neon(url);
  const leaderId = session.user.id;

  for (let attempt = 0; attempt < 12; attempt++) {
    const joinCode = generateJoinCode();
    let groupId: string | null = null;
    try {
      const inserted = await sql`
        INSERT INTO "groups" (name, join_code, leader_id)
        VALUES (${name}, ${joinCode}, ${leaderId}::uuid)
        RETURNING id::text, name, join_code
      `;
      const row = (inserted as { id: string; name: string; join_code: string }[])[0];
      if (!row?.id) continue;
      groupId = row.id;
      await sql`
        INSERT INTO group_members (group_id, user_id)
        VALUES (${groupId}::uuid, ${leaderId}::uuid)
      `;
      try {
        await checkAndAwardPatches(leaderId, { isGroupLeader: true });
      } catch {
        /* silent */
      }
      return NextResponse.json({
        group: {
          id: row.id,
          name: row.name,
          joinCode: row.join_code,
        },
      });
    } catch (e: unknown) {
      if (groupId) {
        try {
          await sql`DELETE FROM "groups" WHERE id = ${groupId}::uuid`;
        } catch {
          /* silent */
        }
      }
      const code = (e as { code?: string })?.code;
      if (code === "23505") continue;
      return NextResponse.json({ error: "Unable to create unit" }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Unable to create unit" }, { status: 503 });
}
