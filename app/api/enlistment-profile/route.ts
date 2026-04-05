import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { awardPatch } from "@/lib/award-patches";

type Body = {
  branch?: string;
  component?: string;
  targetDate?: string | null;
  age?: number;
  gender?: string;
  currentPushups?: number;
  currentRunMinutes?: number;
  currentRunSeconds?: number;
  limitations?: string;
};

function normComponent(s: string): string | null {
  const t = s.trim();
  if (
    t === "Active Duty" ||
    t === "Army Reserve" ||
    t === "National Guard"
  ) {
    return t;
  }
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(null, { status: 401 });
  }
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json(null);
  }
  try {
    const sql = neon(url);
    const rows = (await sql`
      SELECT
        ep.branch,
        ep.component,
        ep.target_date,
        ep.age,
        ep.gender,
        ep.current_pushups,
        ep.current_run_minutes,
        ep.current_run_seconds,
        ep.limitations,
        ep.plan_markdown,
        ep.updated_at,
        COALESCE(
          (SELECT MAX(p.week_number)::int FROM enlistment_progress p WHERE p.user_id = ep.user_id),
          0
        ) AS max_week_completed
      FROM enlistment_profiles ep
      WHERE ep.user_id = ${session.user.id}::uuid
      LIMIT 1
    `) as Record<string, unknown>[];
    return NextResponse.json(rows[0] ?? null);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const branch =
    typeof body.branch === "string" && body.branch.trim()
      ? body.branch.trim()
      : "Army";
  const component = normComponent(String(body.component ?? ""));
  if (!component) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const age = Number(body.age);
  if (!Number.isFinite(age) || age < 17 || age > 100) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const gRaw = String(body.gender ?? "").toLowerCase();
  const gender = gRaw === "female" ? "female" : "male";

  const pu = Number(body.currentPushups);
  const rm = Number(body.currentRunMinutes);
  const rs = Number(body.currentRunSeconds);
  if (!Number.isFinite(pu) || pu < 0 || pu > 999) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!Number.isFinite(rm) || rm < 0 || rm > 120) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!Number.isFinite(rs) || rs < 0 || rs > 59) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let targetDate: string | null = null;
  if (body.targetDate != null && String(body.targetDate).trim() !== "") {
    const d = String(body.targetDate).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) targetDate = d;
  }

  const limitations =
    typeof body.limitations === "string" ? body.limitations : "";

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const sql = neon(url);
    await sql`
      INSERT INTO enlistment_profiles (
        user_id,
        branch,
        component,
        target_date,
        age,
        gender,
        current_pushups,
        current_run_minutes,
        current_run_seconds,
        limitations,
        updated_at
      )
      VALUES (
        ${session.user.id}::uuid,
        ${branch},
        ${component},
        ${targetDate}::date,
        ${Math.floor(age)},
        ${gender},
        ${Math.floor(pu)},
        ${Math.floor(rm)},
        ${Math.floor(rs)},
        ${limitations},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        branch = EXCLUDED.branch,
        component = EXCLUDED.component,
        target_date = EXCLUDED.target_date,
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        current_pushups = EXCLUDED.current_pushups,
        current_run_minutes = EXCLUDED.current_run_minutes,
        current_run_seconds = EXCLUDED.current_run_seconds,
        limitations = EXCLUDED.limitations,
        updated_at = NOW()
    `;
    await awardPatch(session.user.id, "civilian_ready");
  } catch {
    /* silent */
  }

  return NextResponse.json({ ok: true });
}
