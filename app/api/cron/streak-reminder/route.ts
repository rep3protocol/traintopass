import { NextResponse } from "next/server";
import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";
import { escapeHtml } from "@/lib/html-escape";
import { sendStreakReminder } from "@/lib/send-notification";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  console.log("Authorization header:", authHeader);
  console.log("CRON_SECRET:", process.env.CRON_SECRET);
  if (
    process.env.CRON_SECRET === undefined ||
    process.env.CRON_SECRET === null ||
    String(process.env.CRON_SECRET).trim() === ""
  ) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const token =
    authHeader?.replace("Bearer ", "").trim() ?? "";
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_WEEKLY?.trim() ||
    "Train to Pass <noreply@traintopass.com>";

  if (!url || !resendKey) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const sql = neon(url);
  const today = utcToday();

  let challengeTitle = "today's challenge";
  try {
    const ch = (await sql`
      SELECT title FROM daily_challenges
      WHERE challenge_date = ${today}::date
      LIMIT 1
    `) as { title: string }[];
    if (ch[0]?.title) challengeTitle = ch[0].title;
  } catch {
    /* silent */
  }

  let candidates: {
    id: string;
    name: string | null;
    email: string | null;
    activity_streak: number | null;
  }[] = [];

  try {
    candidates = (await sql`
      SELECT u.id::text, u.name, u.email, u.activity_streak
      FROM users u
      WHERE u.email IS NOT NULL
        AND COALESCE(u.notification_streak_enabled, true) = true
        AND COALESCE(u.activity_streak, 0) > 0
        AND u.last_active_date IS NOT NULL
        AND u.last_active_date::date < (CURRENT_DATE - INTERVAL '2 days')
    `) as typeof candidates;
  } catch {
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  let sent = 0;
  let failed = 0;
  let pushed = 0;

  for (const row of candidates) {
    if (!row.email?.trim()) continue;
    let paid = false;
    try {
      paid = await getUserSubscriptionPaid(row.id);
    } catch {
      paid = false;
    }
    if (!paid) continue;

    const streak = Number(row.activity_streak ?? 0);
    const firstName =
      row.name?.trim().split(/\s+/)[0] ||
      row.email.split("@")[0] ||
      "Athlete";
    const subject = `🔥 Don't break your streak — ${streak} days and counting`;
    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;color:#e5e5e5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;padding:28px;">
        <tr><td>
          <p style="margin:0 0 12px 0;color:#fafafa;font-size:20px;font-weight:600;letter-spacing:0.06em;">TRAIN TO PASS</p>
          <p style="margin:0 0 20px 0;color:#a3a3a3;font-size:15px;">Hey ${firstName}</p>
          <p style="margin:0 0 16px 0;color:#fafafa;font-size:16px;line-height:1.5;">You're on a <strong style="color:#4ade80;">${streak}-day</strong> streak. Log in and keep the momentum.</p>
          <p style="margin:0 0 20px 0;color:#d4d4d4;font-size:14px;line-height:1.55;">Today's challenge: <strong>${escapeHtml(challengeTitle)}</strong></p>
          <a href="https://traintopass.com/challenge" style="display:inline-block;padding:12px 20px;background:#4ade80;color:#0a0a0a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;">Open challenge →</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await resend.emails.send({
        from,
        to: row.email.trim(),
        subject,
        html,
      });
      sent += 1;
    } catch {
      failed += 1;
    }

    try {
      await sendStreakReminder(row.id, streak);
      pushed += 1;
    } catch {
      /* silent */
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    pushAttempts: pushed,
    scanned: candidates.length,
  });
}
