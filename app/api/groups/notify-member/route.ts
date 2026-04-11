import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { auth } from "@/auth";
import { isUuidParam } from "@/lib/group-route-helpers";

export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: string; groupId?: string };
  try {
    body = (await req.json()) as { userId?: string; groupId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
  if (!isUuidParam(userId) || !isUuidParam(groupId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!url || !resendKey) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const sql = neon(url);
  const leaderId = session.user.id;

  const groupRows = await sql`
    SELECT leader_id::text FROM "groups" WHERE id = ${groupId}::uuid LIMIT 1
  `;
  const rowLeader = (groupRows as { leader_id: string }[])[0]?.leader_id;
  if (!rowLeader || rowLeader !== leaderId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inSubtree = await sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "groups" WHERE id = ${groupId}::uuid
      UNION ALL
      SELECT g.id FROM "groups" g
      INNER JOIN subtree s ON g.parent_group_id = s.id
    )
    SELECT 1 AS x
    FROM group_members gm
    WHERE gm.user_id = ${userId}::uuid
      AND gm.group_id IN (SELECT id FROM subtree)
    LIMIT 1
  `;
  if ((inSubtree as unknown[]).length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const urows = await sql`
    SELECT name, email FROM users WHERE id = ${userId}::uuid LIMIT 1
  `;
  const u = (urows as { name: string | null; email: string | null }[])[0];
  const email = u?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "No email" }, { status: 400 });
  }

  const displayName = u.name?.trim() || email.split("@")[0] || "Athlete";
  const html = `<p>Hi ${escapeHtml(displayName)}, your unit commander has flagged your AFT readiness for follow-up. Log in to Train to Pass to view your training plan and next steps.</p>`;

  const resend = new Resend(resendKey);
  try {
    const out = await resend.emails.send({
      from: "Train to Pass <noreply@traintopass.com>",
      to: email,
      replyTo: "hello@traintopass.com",
      subject: "Your commander has flagged your AFT readiness",
      html,
    });
    if (out.error) {
      console.error("Resend notify-member error:", JSON.stringify(out.error));
      return NextResponse.json({ error: "Send failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("notify-member:", e);
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }
}
