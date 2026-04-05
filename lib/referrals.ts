import { neon } from "@neondatabase/serverless";

/** Credits referrer when a referred user completes first paid subscription (called from verify-session). */
export async function creditReferrerOnFirstPayment(
  payingUserId: string
): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;
  const sql = neon(url);
  let ref:
    | {
        id: string;
        referrer_id: string;
      }
    | undefined;
  try {
    const rows = (await sql`
      SELECT id, referrer_id
      FROM referrals
      WHERE referred_user_id = ${payingUserId}::uuid
        AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
    `) as typeof ref[];
    ref = rows[0];
  } catch {
    return;
  }
  if (!ref) return;

  let updated = false;
  try {
    const u = (await sql`
      UPDATE referrals
      SET
        status = 'completed',
        referrer_credited_at = COALESCE(referrer_credited_at, NOW())
      WHERE id = ${ref.id}::uuid
        AND status = 'pending'
      RETURNING id
    `) as { id: string }[];
    updated = u.length > 0;
  } catch {
    return;
  }
  if (!updated) return;

  try {
    await sql`
      UPDATE users
      SET free_months_credited = COALESCE(free_months_credited, 0) + 1
      WHERE id = ${ref.referrer_id}::uuid
    `;
  } catch {
    /* silent */
  }
}
