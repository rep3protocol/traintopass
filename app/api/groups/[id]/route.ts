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
    const del = await sql`
      DELETE FROM "groups"
      WHERE id = ${groupId}::uuid AND leader_id = ${uid}::uuid
      RETURNING id
    `;
    if ((del as unknown[]).length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete" }, { status: 503 });
  }
}
