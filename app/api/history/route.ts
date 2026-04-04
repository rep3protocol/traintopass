import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export type HistoryRow = {
  id: string;
  age_group: string;
  gender: string;
  total_score: number;
  event_scores: Record<string, number>;
  created_at: string;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({ entries: [] as HistoryRow[] });
  }

  const sql = neon(url);
  let raw: Record<string, unknown>[];
  try {
    raw = await sql`
      SELECT id, age_group, gender, total_score, event_scores, created_at
      FROM score_history
      WHERE user_id = ${session.user.id}::uuid
      ORDER BY created_at DESC
      LIMIT 50
    `;
  } catch {
    return NextResponse.json({ entries: [] as HistoryRow[] });
  }

  const rows: HistoryRow[] = raw.map((r) => ({
    id: String(r.id ?? ""),
    age_group: String(r.age_group ?? ""),
    gender: String(r.gender ?? ""),
    total_score: Number(r.total_score ?? 0),
    event_scores:
      r.event_scores && typeof r.event_scores === "object"
        ? (r.event_scores as Record<string, number>)
        : {},
    created_at: String(r.created_at ?? ""),
  }));

  return NextResponse.json({ entries: rows });
}
