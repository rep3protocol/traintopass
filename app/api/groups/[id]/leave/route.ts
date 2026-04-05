import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUuidParam } from "@/lib/group-route-helpers";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
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

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const sql = neon(url);
  const uid = session.user.id;

  try {
    const mem = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${groupId}::uuid AND user_id = ${uid}::uuid
      LIMIT 1
    `;
    if ((mem as unknown[]).length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const g = await sql`
      SELECT leader_id::text FROM "groups" WHERE id = ${groupId}::uuid LIMIT 1
    `;
    const leaderId = (g as { leader_id: string }[])[0]?.leader_id;
    if (!leaderId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isLeader = leaderId === uid;

    if (!isLeader) {
      await sql`
        DELETE FROM group_members
        WHERE group_id = ${groupId}::uuid AND user_id = ${uid}::uuid
      `;
      return NextResponse.json({ success: true });
    }

    const others = await sql`
      SELECT user_id::text FROM group_members
      WHERE group_id = ${groupId}::uuid AND user_id != ${uid}::uuid
      ORDER BY joined_at ASC
      LIMIT 1
    `;
    const nextLeader = (others as { user_id: string }[])[0]?.user_id;

    if (!nextLeader) {
      await sql`DELETE FROM "groups" WHERE id = ${groupId}::uuid`;
      return NextResponse.json({ success: true });
    }

    await sql`
      UPDATE "groups" SET leader_id = ${nextLeader}::uuid WHERE id = ${groupId}::uuid
    `;
    await sql`
      DELETE FROM group_members
      WHERE group_id = ${groupId}::uuid AND user_id = ${uid}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to leave" }, { status: 503 });
  }
}
