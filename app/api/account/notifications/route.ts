import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({
      missed_training: true,
      close_to_passing: true,
      streak: true,
      challenge: true,
      unit: true,
    });
  }

  const sql = neon(url);
  try {
    const rows = (await sql`
      SELECT
        notif_missed_training,
        notif_close_to_passing,
        notification_streak_enabled,
        notification_challenge_enabled,
        notification_unit_enabled
      FROM users
      WHERE id = ${session.user.id}::uuid
    `) as {
      notif_missed_training: boolean | null;
      notif_close_to_passing: boolean | null;
      notification_streak_enabled: boolean | null;
      notification_challenge_enabled: boolean | null;
      notification_unit_enabled: boolean | null;
    }[];
    const r = rows[0];
    return NextResponse.json({
      missed_training: r?.notif_missed_training !== false,
      close_to_passing: r?.notif_close_to_passing !== false,
      streak: r?.notification_streak_enabled !== false,
      challenge: r?.notification_challenge_enabled !== false,
      unit: r?.notification_unit_enabled !== false,
    });
  } catch {
    return NextResponse.json({
      missed_training: true,
      close_to_passing: true,
      streak: true,
      challenge: true,
      unit: true,
    });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    missed_training?: boolean;
    close_to_passing?: boolean;
    streak?: boolean;
    challenge?: boolean;
    unit?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ ok: true });
  }

  const sql = neon(url);
  try {
    if (typeof body.missed_training === "boolean") {
      await sql`
        UPDATE users
        SET notif_missed_training = ${body.missed_training}
        WHERE id = ${session.user.id}::uuid
      `;
    }
    if (typeof body.close_to_passing === "boolean") {
      await sql`
        UPDATE users
        SET notif_close_to_passing = ${body.close_to_passing}
        WHERE id = ${session.user.id}::uuid
      `;
    }
    if (typeof body.streak === "boolean") {
      await sql`
        UPDATE users
        SET notification_streak_enabled = ${body.streak}
        WHERE id = ${session.user.id}::uuid
      `;
    }
    if (typeof body.challenge === "boolean") {
      await sql`
        UPDATE users
        SET notification_challenge_enabled = ${body.challenge}
        WHERE id = ${session.user.id}::uuid
      `;
    }
    if (typeof body.unit === "boolean") {
      await sql`
        UPDATE users
        SET notification_unit_enabled = ${body.unit}
        WHERE id = ${session.user.id}::uuid
      `;
    }
  } catch {
    /* silent */
  }

  return NextResponse.json({ ok: true });
}
