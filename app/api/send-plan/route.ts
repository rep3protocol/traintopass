import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { AnalyzeResponseBody } from "@/lib/analyze-types";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  let body: { email?: string; plan?: AnalyzeResponseBody };
  try {
    body = (await req.json()) as { email?: string; plan?: AnalyzeResponseBody };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!body.plan || typeof body.plan !== "object" || !body.plan.events) {
    return NextResponse.json({ error: "Invalid plan payload" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { buildFullPlanEmailHtml } = await import("@/lib/build-plan-email-html");
  const html = buildFullPlanEmailHtml(body.plan);
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Train to Pass <onboarding@resend.dev>";

  const resend = new Resend(key);
  try {
    await resend.emails.send({
      from,
      to: email,
      subject: "Your 4-week AFT training plan — Train to Pass",
      html,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
