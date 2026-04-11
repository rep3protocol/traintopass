import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export type WorkoutLogApiRow = {
  id: string;
  log_date: string;
  notes: string;
  exercises: unknown[];
  created_at: string;
};

function formatLogDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return "";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json([] as WorkoutLogApiRow[]);
  }

  const sql = neon(url);
  let raw: Record<string, unknown>[];
  try {
    raw = await sql`
      SELECT id, log_date, notes, exercises, created_at
      FROM workout_logs
      WHERE user_id = ${session.user.id}::uuid
      ORDER BY log_date DESC
      LIMIT 30
    `;
  } catch {
    return NextResponse.json([] as WorkoutLogApiRow[]);
  }

  const rows: WorkoutLogApiRow[] = raw.map((r) => ({
    id: String(r.id ?? ""),
    log_date: formatLogDate(r.log_date),
    notes: String(r.notes ?? ""),
    exercises: Array.isArray(r.exercises)
      ? r.exercises
      : typeof r.exercises === "object" && r.exercises !== null
        ? (r.exercises as unknown[])
        : [],
    created_at: String(r.created_at ?? ""),
  }));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const logDate =
    typeof o.log_date === "string" && o.log_date.trim() !== ""
      ? o.log_date.trim().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const notes = typeof o.notes === "string" ? o.notes : "";
  if (!Array.isArray(o.exercises)) {
    return NextResponse.json({ error: "Invalid exercises" }, { status: 400 });
  }

  const exercisesJson = JSON.stringify(o.exercises);
  const sql = neon(url);

  let inserted: { id: string }[];
  try {
    inserted = (await sql`
      INSERT INTO workout_logs (user_id, log_date, notes, exercises)
      VALUES (
        ${session.user.id}::uuid,
        ${logDate}::date,
        ${notes},
        CAST(${exercisesJson} AS jsonb)
      )
      RETURNING id
    `) as { id: string }[];
  } catch {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  const id = inserted[0]?.id;
  if (!id) {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ id: String(id) });
}
