import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUuidParam } from "@/lib/group-route-helpers";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const MAX_LEN = 500;

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

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const message =
    typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_LEN) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

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

    const mem = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${groupId}::uuid AND user_id = ${uid}::uuid
      LIMIT 1
    `;
    if ((mem as unknown[]).length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ins = await sql`
      INSERT INTO group_announcements (group_id, leader_id, message)
      VALUES (${groupId}::uuid, ${uid}::uuid, ${message})
      RETURNING id::text, message, created_at
    `;
    const row = (ins as { id: string; message: string; created_at: string }[])[0];
    if (!row) {
      return NextResponse.json({ error: "Unable to post" }, { status: 503 });
    }

    return NextResponse.json({
      announcement: {
        id: row.id,
        message: row.message,
        createdAt: String(row.created_at ?? ""),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to post" }, { status: 503 });
  }
}
