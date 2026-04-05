import { neon } from "@neondatabase/serverless";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomReferralCodeSegment(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length];
  }
  return out;
}

/** Returns a unique 8-char uppercase alphanumeric code for users.referral_code */
export async function generateUniqueUserReferralCode(): Promise<string> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return randomReferralCodeSegment(8);
  const sql = neon(url);
  for (let attempt = 0; attempt < 24; attempt++) {
    const code = randomReferralCodeSegment(8);
    try {
      const rows = (await sql`
        SELECT id FROM users WHERE referral_code = ${code} LIMIT 1
      `) as unknown[];
      if (rows.length === 0) return code;
    } catch {
      return code;
    }
  }
  return `${randomReferralCodeSegment(4)}${randomReferralCodeSegment(4)}`;
}
