import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUuidParam } from "@/lib/group-route-helpers";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET(
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
    return NextResponse.json({ announcements: [] });
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

    const raw = await sql`
      SELECT id::text, message, created_at
      FROM group_announcements
      WHERE group_id = ${groupId}::uuid
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const announcements = (raw as { id: string; message: string; created_at: string }[]).map(
      (r) => ({
        id: r.id,
        message: r.message,
        createdAt: String(r.created_at ?? ""),
      })
    );

    return NextResponse.json({ announcements });
  } catch {
    return NextResponse.json({ announcements: [] });
  }
}
