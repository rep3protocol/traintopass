import { neon } from "@neondatabase/serverless";
import { hasActiveStripeSubscription } from "@/lib/stripe-subscription";

export async function getUserSubscriptionPaid(userId: string): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) return false;
  const sql = neon(url);
  try {
    const rows = await sql`
      SELECT stripe_customer_id FROM users WHERE id = ${userId}::uuid
    `;
    return hasActiveStripeSubscription(rows[0]?.stripe_customer_id);
  } catch {
    return false;
  }
}

export async function getUserStripeCustomerId(
  userId: string
): Promise<string | null> {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) return null;
  const sql = neon(url);
  try {
    const rows = await sql`
      SELECT stripe_customer_id FROM users WHERE id = ${userId}::uuid
    `;
    const v = rows[0]?.stripe_customer_id;
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  } catch {
    return null;
  }
}
