import { escapeHtml } from "@/lib/html-escape";

export const ADMIN_BROADCAST_USER_EMAIL = "luisraulcorrea77@gmail.com";

export const BROADCAST_EXCLUDED_EMAILS_LOWER = [
  "luisraulcorrea77@gmail.com",
  "shadowluis513@yahoo.com",
  "luisraul142@gmail.com",
  "rep3protocol@gmail.com",
] as const;

const EXCLUDED = new Set<string>(BROADCAST_EXCLUDED_EMAILS_LOWER);

export function isBroadcastRecipientEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.length > 0 && !EXCLUDED.has(e);
}

export function broadcastRecipientFirstName(
  name: string | null | undefined,
  email: string
): string {
  const part = name?.trim().split(/\s+/)[0];
  if (part) return part;
  const local = email.trim().split("@")[0];
  return local || "there";
}

export function buildBroadcastEmailHtml(
  firstName: string,
  messageBody: string
): string {
  const bodyHtml = escapeHtml(messageBody).replace(/\n/g, "<br/>");
  const fn = escapeHtml(firstName);
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;color:#e5e5e5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2a2a2a;padding:28px;">
        <tr><td>
          <p style="margin:0 0 16px 0;color:#fafafa;font-size:16px;line-height:1.55;">Hey ${fn},</p>
          <div style="margin:0 0 24px 0;color:#d4d4d4;font-size:15px;line-height:1.6;">${bodyHtml}</div>
          <p style="margin:0 0 8px 0;color:#737373;font-size:13px;">---</p>
          <p style="margin:0 0 4px 0;color:#a3a3a3;font-size:13px;">Train to Pass · traintopass.com</p>
          <p style="margin:0 0 8px 0;color:#a3a3a3;font-size:13px;">You're receiving this because you signed up for Train to Pass beta.</p>
          <p style="margin:0;color:#737373;font-size:13px;">---</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
