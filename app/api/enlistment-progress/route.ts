import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { awardPatch } from "@/lib/award-patches";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let weekNumber = 0;
  let notes: string | null = null;
  try {
    const body = (await req.json()) as {
      weekNumber?: number;
      notes?: string;
    };
    weekNumber = Number(body.weekNumber);
    if (typeof body.notes === "string" && body.notes.trim()) {
      notes = body.notes.trim().slice(0, 2000);
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 12) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const sql = neon(url);
    await sql`
      INSERT INTO enlistment_progress (user_id, week_number, notes)
      VALUES (${session.user.id}::uuid, ${Math.floor(weekNumber)}, ${notes})
    `;
    if (weekNumber === 12) {
      await awardPatch(session.user.id, "future_soldier");
    }
  } catch {
    /* silent */
  }

  return NextResponse.json({ ok: true });
}
