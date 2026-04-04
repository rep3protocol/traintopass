import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import type { AnalyzeResponseBody } from "@/lib/analyze-types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { result?: AnalyzeResponseBody };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = body.result;
  if (!data || typeof data.totalScore !== "number" || !data.events) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }

  const eventScores: Record<string, number> = {};
  for (const ev of data.events) {
    eventScores[ev.key] = ev.score;
  }

  const ageGroup = data.ageGroup ?? "—";
  const gender = data.gender === "female" ? "Female" : "Male";
  const eventScoresJson = JSON.stringify(eventScores);

  const sql = neon(url);
  try {
    await sql`
      INSERT INTO score_history (user_id, age_group, gender, total_score, event_scores)
      VALUES (
        ${session.user.id}::uuid,
        ${ageGroup},
        ${gender},
        ${Math.round(data.totalScore)},
        CAST(${eventScoresJson} AS jsonb)
      )
    `;
  } catch {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
