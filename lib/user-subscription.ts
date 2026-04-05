import { neon } from "@neondatabase/serverless";
import { hasActiveStripeSubscription } from "@/lib/stripe-subscription";

const FREE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

async function expireFreeMonthsIfNeeded(
  userId: string,
  row: {
    free_months_credited: number | null;
    free_month_period_start: Date | string | null;
  }
): Promise<{ credited: number; periodStart: Date | null }> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return {
      credited: Math.max(0, Number(row.free_months_credited ?? 0)),
      periodStart:
        row.free_month_period_start != null
          ? new Date(row.free_month_period_start as string | Date)
          : null,
    };
  }
  const sql = neon(dbUrl);
  let credited = Math.max(0, Number(row.free_months_credited ?? 0));
  let periodStart: Date | null =
    row.free_month_period_start != null
      ? new Date(row.free_month_period_start as string | Date)
      : null;
  const now = Date.now();
  let guard = 0;
  while (
    credited > 0 &&
    periodStart != null &&
    now - periodStart.getTime() >= FREE_MONTH_MS &&
    guard < 120
  ) {
    guard += 1;
    credited -= 1;
    if (credited > 0) {
      periodStart = new Date(periodStart.getTime() + FREE_MONTH_MS);
    } else {
      periodStart = null;
    }
    try {
      await sql`
        UPDATE users
        SET
          free_months_credited = ${credited},
          free_month_period_start = ${periodStart}
        WHERE id = ${userId}::uuid
      `;
    } catch {
      /* silent */
    }
  }
  return { credited, periodStart };
}

function hasActiveFreeMonthWindow(
  credited: number,
  periodStart: Date | null
): boolean {
  if (credited <= 0 || periodStart == null) return false;
  return Date.now() - periodStart.getTime() < FREE_MONTH_MS;
}

export async function getUserSubscriptionPaid(userId: string): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) return false;
  const sql = neon(url);
  try {
    const rows = await sql`
      SELECT
        stripe_customer_id,
        free_months_credited,
        free_month_period_start
      FROM users
      WHERE id = ${userId}::uuid
    `;
    const row = rows[0] as
      | {
          stripe_customer_id?: string | null;
          free_months_credited?: number | null;
          free_month_period_start?: Date | string | null;
        }
      | undefined;
    if (!row) return false;

    const stripeOk = await hasActiveStripeSubscription(row.stripe_customer_id);
    if (stripeOk) return true;

    const expired = await expireFreeMonthsIfNeeded(userId, {
      free_months_credited: row.free_months_credited ?? 0,
      free_month_period_start: row.free_month_period_start ?? null,
    });
    const { credited } = expired;
    let periodStart = expired.periodStart;
    if (credited > 0 && periodStart == null) {
      try {
        await sql`
          UPDATE users
          SET free_month_period_start = NOW()
          WHERE id = ${userId}::uuid
        `;
        periodStart = new Date();
      } catch {
        /* silent */
      }
    }
    return hasActiveFreeMonthWindow(credited, periodStart);
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
