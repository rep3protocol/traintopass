import { NextResponse } from "next/server";
import {
  sendChallengeNotification,
  sendStreakReminder,
  sendUnitAnnouncement,
} from "@/lib/send-notification";

export const dynamic = "force-dynamic";

/** Internal: send a push (cron / server). Authorization: Bearer CRON_SECRET */
export async function POST(req: Request) {
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

  let body: {
    kind?: string;
    userId?: string;
    dayStreak?: number;
    challengeTitle?: string;
    groupId?: string;
    message?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = typeof body.kind === "string" ? body.kind : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (kind === "streak" && userId) {
    const d = Number(body.dayStreak ?? 0);
    await sendStreakReminder(userId, Number.isFinite(d) ? d : 0);
    return NextResponse.json({ ok: true });
  }
  if (kind === "challenge" && userId) {
    const t =
      typeof body.challengeTitle === "string" ? body.challengeTitle : "";
    await sendChallengeNotification(userId, t);
    return NextResponse.json({ ok: true });
  }
  if (kind === "unit") {
    const gid = typeof body.groupId === "string" ? body.groupId.trim() : "";
    const msg = typeof body.message === "string" ? body.message : "";
    if (gid && msg) {
      await sendUnitAnnouncement(gid, msg);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
}
