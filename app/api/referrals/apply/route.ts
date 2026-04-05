import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const codeRaw = typeof body.code === "string" ? body.code.trim() : "";
  const code = codeRaw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 4) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const sql = neon(url);
  const email = session.user.email.trim().toLowerCase();

  try {
    const self = (await sql`
      SELECT referred_by, free_months_credited, free_month_period_start
      FROM users
      WHERE id = ${session.user.id}::uuid
    `) as {
      referred_by: string | null;
      free_months_credited: number | null;
      free_month_period_start: Date | string | null;
    }[];
    if (self[0]?.referred_by) {
      return NextResponse.json({ success: true, alreadyApplied: true });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  let referrerId: string | null = null;
  try {
    const ref = (await sql`
      SELECT id::text FROM users WHERE referral_code = ${code} LIMIT 1
    `) as { id: string }[];
    referrerId = ref[0]?.id ?? null;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!referrerId || referrerId === session.user.id) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const dup = (await sql`
      SELECT id FROM referrals WHERE referred_email = ${email} LIMIT 1
    `) as unknown[];
    if (dup.length > 0) {
      return NextResponse.json({ error: "Referral already used" }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  try {
    await sql`
      INSERT INTO referrals (
        referrer_id,
        referred_email,
        referred_user_id,
        referral_code,
        status,
        referred_credited_at
      )
      VALUES (
        ${referrerId}::uuid,
        ${email},
        ${session.user.id}::uuid,
        ${code},
        'pending',
        NOW()
      )
    `;
  } catch {
    return NextResponse.json({ error: "Could not apply referral" }, { status: 500 });
  }

  try {
    await sql`
      UPDATE users
      SET
        referred_by = ${referrerId}::uuid,
        free_months_credited = COALESCE(free_months_credited, 0) + 1,
        free_month_period_start = COALESCE(
          free_month_period_start,
          NOW()
        )
      WHERE id = ${session.user.id}::uuid
    `;
  } catch {
    /* silent */
  }

  return NextResponse.json({ success: true });
}
