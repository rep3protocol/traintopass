import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({ ok: true });
  }

  const sql = neon(url);
  try {
    await sql`
      UPDATE users
      SET plan_week_12_viewed = TRUE
      WHERE id = ${session.user.id}::uuid
    `;
  } catch {
    /* silent */
  }

  return NextResponse.json({ ok: true });
}
