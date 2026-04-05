import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { profilePublic?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.profilePublic !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const sql = neon(url);
  try {
    await sql`
      UPDATE users
      SET profile_public = ${body.profilePublic}
      WHERE id = ${session.user.id}::uuid
    `;
  } catch {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profilePublic: body.profilePublic });
}
