import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export async function GET(
  _req: Request,
  context: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sql = neon(url);
  let rows: Record<string, unknown>[];
  try {
    rows = await sql`
      SELECT id, age_group, gender, total_score, event_scores, created_at
      FROM score_history
      WHERE id = ${id}::uuid AND user_id = ${session.user.id}::uuid
      LIMIT 1
    `;
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = rows[0];
  if (!raw || typeof raw.id !== "string") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = {
    id: raw.id,
    age_group: String(raw.age_group ?? ""),
    gender: String(raw.gender ?? ""),
    total_score: Number(raw.total_score ?? 0),
    event_scores:
      raw.event_scores && typeof raw.event_scores === "object"
        ? (raw.event_scores as Record<string, number>)
        : {},
    created_at: String(raw.created_at ?? ""),
  };
  return NextResponse.json({ entry: row });
}
