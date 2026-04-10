import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { auth } from "@/auth";
import {
  ADMIN_BROADCAST_USER_EMAIL,
  broadcastRecipientFirstName,
  buildBroadcastEmailHtml,
  isBroadcastRecipientEmail,
} from "@/lib/admin-broadcast-email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function adminEmailOk(email: string | null | undefined): boolean {
  return (
    typeof email === "string" &&
    email.trim().toLowerCase() === ADMIN_BROADCAST_USER_EMAIL
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminEmailOk(session.user.email ?? null)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { subject?: string; message?: string; testOnly?: boolean };
  try {
    body = (await req.json()) as {
      subject?: string;
      message?: string;
      testOnly?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subject =
    typeof body.subject === "string" ? body.subject.trim() : "";
  const message =
    typeof body.message === "string" ? body.message.trim() : "";
  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const testOnly = body.testOnly === true;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (testOnly) {
    const resend = new Resend(resendKey);
    const from = "Train to Pass <noreply@traintopass.com>";
    const to = ADMIN_BROADCAST_USER_EMAIL;
    const first = broadcastRecipientFirstName(session.user.name, to);
    const html = buildBroadcastEmailHtml(first, message);
    try {
      const out = await resend.emails.send({
        from,
        to,
        subject,
        html,
        replyTo: "hello@traintopass.com",
      });
      if (out.error) {
        console.error("Resend test email error:", JSON.stringify(out.error));
        return NextResponse.json({ sent: 0, failed: 1, error: out.error });
      }
      return NextResponse.json({ sent: 1, failed: 0 });
    } catch {
      return NextResponse.json({ sent: 0, failed: 1 });
    }
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const sql = neon(url);
  let rows: { email: string; name: string | null }[] = [];
  try {
    rows = (await sql`
      SELECT email, name
      FROM users
      WHERE email IS NOT NULL
        AND TRIM(email) <> ''
    `) as { email: string; name: string | null }[];
  } catch {
    return NextResponse.json(
      { error: "Failed to load recipients" },
      { status: 500 }
    );
  }

  const recipients = rows.filter((r) =>
    isBroadcastRecipientEmail(String(r.email ?? ""))
  );

  const resend = new Resend(resendKey);
  const from = "Train to Pass <noreply@traintopass.com>";
  let sent = 0;
  let failed = 0;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (const row of recipients) {
    const to = String(row.email).trim();
    if (!to) {
      failed += 1;
      continue;
    }
    const first = broadcastRecipientFirstName(row.name, to);
    const html = buildBroadcastEmailHtml(first, message);
    try {
      const out = await resend.emails.send({
        from,
        to,
        subject,
        html,
        replyTo: "hello@traintopass.com",
      });
      await delay(250);
      if (out.error) failed += 1;
      else sent += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ sent, failed });
}
