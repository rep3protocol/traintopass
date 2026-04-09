import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAllowedMilitaryRank } from "@/lib/military-rank";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { militaryRank?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!("militaryRank" in body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body.militaryRank;
  const normalized =
    raw == null || typeof raw !== "string"
      ? null
      : raw.trim() === ""
        ? null
        : raw.trim();

  if (normalized != null && !isAllowedMilitaryRank(normalized)) {
    return NextResponse.json({ error: "Invalid rank" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ ok: true, skipped: true, militaryRank: normalized });
  }

  const sql = neon(url);
  try {
    await sql`
      UPDATE users
      SET military_rank = ${normalized}
      WHERE id = ${session.user.id}::uuid
    `;
  } catch {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, militaryRank: normalized });
}
