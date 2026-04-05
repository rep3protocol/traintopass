import { NextResponse } from "next/server";
import { creditReferrerOnFirstPayment } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/** Internal: first payment completed for referred user (also invoked from verify-session). */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  await creditReferrerOnFirstPayment(userId);
  return NextResponse.json({ ok: true });
}
