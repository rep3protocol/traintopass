import { NextResponse } from "next/server";
import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";
import { weakestEventKeyFromScores } from "@/lib/award-patches";
import { isPatchKey, PATCHES } from "@/lib/patches";
import { EVENT_LABELS, type EventKey } from "@/lib/aft-scoring";
import { parseRankId, rankName } from "@/lib/ranks";
import { escapeHtml } from "@/lib/html-escape";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function tipForWeakestEvent(key: EventKey | null): string {
  if (!key) {
    return "Keep logging assessments so we can target your next focus area.";
  }
  const label = EVENT_LABELS[key];
  const tips: Partial<Record<EventKey, string>> = {
    mdl: `Spend an extra block on ${label} — hinge and leg drive beat yanking with your back.`,
    hrp: `For ${label}, lock your plank and treat each rep like a controlled push, not a bounce.`,
    sdc: `${label} rewards smooth transitions — practice the lane order at sub-max speed, then add pace.`,
    plk: `On ${label}, breathe steady and squeeze glutes — small breaks cost big points.`,
    twoMR: `Build ${label} with one tempo run weekly plus strides; negative splits beat redlining early.`,
  };
  return tips[key] ?? `Prioritize ${label} in your next training block — small weekly gains compound.`;
}

function buildDigestHtml(payload: {
  firstName: string;
  rankLabel: string;
  streak: number;
  bestThisWeek: number | null;
  bestPrevWeek: number | null;
  newPatchNames: string[];
  weakTip: string;
  challengeSummary: string | null;
}): string {
  const delta =
    payload.bestThisWeek != null && payload.bestPrevWeek != null
      ? payload.bestThisWeek - payload.bestPrevWeek
      : null;
  const trend =
    delta == null
      ? "Not enough data from the last two weeks to compare — keep logging runs."
      : delta > 0
        ? `Up ${delta} points vs your prior-week best.`
        : delta < 0
          ? `Down ${Math.abs(delta)} points vs your prior-week best — adjust and come back stronger.`
          : `Holding steady vs last week — consistency wins.`;

  const patchesBlock =
    payload.newPatchNames.length > 0
      ? `<p style="margin:16px 0 8px 0;color:#a3a3a3;font-size:13px;">New patches: <strong style="color:#4ade80;">${payload.newPatchNames.join(", ")}</strong></p>`
      : "";

  const challengeBlock =
    payload.challengeSummary && payload.challengeSummary.trim()
      ? `<p style="margin:20px 0 8px 0;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Today's challenge</p>
          <p style="margin:0 0 16px 0;color:#d4d4d4;font-size:14px;line-height:1.55;">${escapeHtml(payload.challengeSummary.trim())}</p>`
      : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;color:#e5e5e5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;padding:28px;">
        <tr><td>
          <p style="margin:0 0 12px 0;color:#fafafa;font-size:20px;font-weight:600;letter-spacing:0.06em;">TRAIN TO PASS</p>
          <p style="margin:0 0 20px 0;color:#a3a3a3;font-size:15px;">Welcome back, ${payload.firstName}</p>
          <p style="margin:0 0 8px 0;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Current rank</p>
          <p style="margin:0 0 16px 0;color:#4ade80;font-size:18px;font-weight:600;">${payload.rankLabel}</p>
          <p style="margin:0 0 8px 0;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Streak</p>
          <p style="margin:0 0 16px 0;color:#fafafa;font-size:16px;">🔥 ${payload.streak} days</p>
          <p style="margin:0 0 8px 0;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Score trend</p>
          <p style="margin:0 0 8px 0;color:#d4d4d4;font-size:14px;line-height:1.5;">${trend}</p>
          ${patchesBlock}
          ${challengeBlock}
          <p style="margin:20px 0 8px 0;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Focus this week</p>
          <p style="margin:0 0 24px 0;color:#d4d4d4;font-size:14px;line-height:1.55;">${payload.weakTip}</p>
          <a href="https://traintopass.com" style="display:inline-block;padding:12px 20px;background:#4ade80;color:#0a0a0a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;">Keep Training →</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
  let globalChallengeSummary: string | null = null;
  try {
    const ch = (await sql`
      SELECT title, description
      FROM daily_challenges
      WHERE challenge_date = ${today}::date
      LIMIT 1
    `) as { title: string; description: string }[];
    if (ch[0]) {
      globalChallengeSummary = `${ch[0].title}: ${ch[0].description}`.slice(
        0,
        400
      );
    }
  } catch {
    globalChallengeSummary = null;
  }

  let candidates: {
    id: string;
    name: string | null;
    email: string | null;
    activity_streak: number | null;
    current_rank: string | null;
  }[] = [];

  try {
    candidates = (await sql`
      SELECT
        u.id::text,
        u.name,
        u.email,
        u.activity_streak,
        u.current_rank
      FROM users u
      WHERE u.email IS NOT NULL
        AND (
          (
            u.last_active_date IS NOT NULL
            AND u.last_active_date >= (CURRENT_DATE - INTERVAL '30 days')
          )
          OR EXISTS (
            SELECT 1
            FROM score_history sh
            WHERE sh.user_id = u.id
              AND sh.created_at >= NOW() - INTERVAL '30 days'
          )
        )
    `) as typeof candidates;
  } catch {
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  let sent = 0;
  let failed = 0;

  for (const row of candidates) {
    if (!row.email?.trim()) continue;
    let paid = false;
    try {
      paid = await getUserSubscriptionPaid(row.id);
    } catch {
      paid = false;
    }
    if (!paid) continue;

    let bestThisWeek: number | null = null;
    let bestPrevWeek: number | null = null;
    let eventScores: Record<string, number> | null = null;
    try {
      const tw = (await sql`
        SELECT MAX(total_score)::int AS m
        FROM score_history
        WHERE user_id = ${row.id}::uuid
          AND created_at >= NOW() - INTERVAL '7 days'
      `) as { m: number | null }[];
      bestThisWeek =
        tw[0]?.m != null ? Number(tw[0].m) : null;
      const pw = (await sql`
        SELECT MAX(total_score)::int AS m
        FROM score_history
        WHERE user_id = ${row.id}::uuid
          AND created_at >= NOW() - INTERVAL '14 days'
          AND created_at < NOW() - INTERVAL '7 days'
      `) as { m: number | null }[];
      bestPrevWeek =
        pw[0]?.m != null ? Number(pw[0].m) : null;
    } catch {
      /* silent */
    }

    try {
      const latest = (await sql`
        SELECT event_scores
        FROM score_history
        WHERE user_id = ${row.id}::uuid
        ORDER BY created_at DESC
        LIMIT 1
      `) as { event_scores: Record<string, number> }[];
      eventScores = latest[0]?.event_scores ?? null;
    } catch {
      eventScores = null;
    }

    let newPatchNames: string[] = [];
    try {
      const patchRows = (await sql`
        SELECT patch_key
        FROM achievement_patches
        WHERE user_id = ${row.id}::uuid
          AND earned_at >= NOW() - INTERVAL '7 days'
      `) as { patch_key: string }[];
      newPatchNames = patchRows
        .map((r) => r.patch_key)
        .filter(isPatchKey)
        .map((k) => PATCHES[k].name);
    } catch {
      newPatchNames = [];
    }

    const rankId = parseRankId(row.current_rank ?? undefined);
    const rankLabel = `${rankName(rankId)} (${rankId})`;
    const firstName =
      row.name?.trim().split(/\s+/)[0] || row.email.split("@")[0] || "Athlete";
    const streak = Number(row.activity_streak ?? 0);
    const weak = weakestEventKeyFromScores(eventScores);
    const weakTip = tipForWeakestEvent(weak);

    const html = buildDigestHtml({
      firstName,
      rankLabel,
      streak,
      bestThisWeek,
      bestPrevWeek,
      newPatchNames,
      weakTip,
      challengeSummary: globalChallengeSummary,
    });

    try {
      await resend.emails.send({
        from,
        to: row.email.trim(),
        subject: "Your Weekly AFT Report — Train to Pass",
        html,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, scanned: candidates.length });
}
