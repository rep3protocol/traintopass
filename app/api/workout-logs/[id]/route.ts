import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUuidParam } from "@/lib/group-route-helpers";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const id = params.id;
  if (!isUuidParam(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const uid = session.user.id;

  let updated: unknown[];
  try {
    updated = await sql`
      UPDATE workout_logs
      SET
        log_date = ${logDate}::date,
        notes = ${notes},
        exercises = CAST(${exercisesJson} AS jsonb),
        updated_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${uid}::uuid
      RETURNING id
    `;
  } catch {
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }

  if ((updated as unknown[]).length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const id = params.id;
  if (!isUuidParam(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const sql = neon(url);
  const uid = session.user.id;

  let deleted: unknown[];
  try {
    deleted = await sql`
      DELETE FROM workout_logs
      WHERE id = ${id}::uuid AND user_id = ${uid}::uuid
      RETURNING id
    `;
  } catch {
    return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  }

  if ((deleted as unknown[]).length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
