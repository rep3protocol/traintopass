import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "Knee pain",
  "Lower back pain",
  "Shoulder pain",
  "None",
]);

function normalizeLimitations(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && ALLOWED.has(x) && !out.includes(x)) {
      out.push(x);
    }
  }
  if (out.includes("None")) return ["None"];
  return out;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ limitations: [] as string[] });
  }

  const sql = neon(url);
  try {
    const rows = (await sql`
      SELECT limitations FROM users WHERE id = ${session.user.id}::uuid
    `) as { limitations: unknown }[];
    const raw = rows[0]?.limitations;
    let arr: unknown = raw;
    if (typeof raw === "string") {
      try {
        arr = JSON.parse(raw) as unknown;
      } catch {
        arr = [];
      }
    }
    return NextResponse.json({
      limitations: normalizeLimitations(arr),
    });
  } catch {
    return NextResponse.json({ limitations: [] as string[] });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { limitations?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const next = normalizeLimitations(body.limitations);
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ ok: true });
  }

  const sql = neon(url);
  const json = JSON.stringify(next);
  try {
    await sql`
      UPDATE users
      SET limitations = CAST(${json} AS jsonb)
      WHERE id = ${session.user.id}::uuid
    `;
  } catch {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
