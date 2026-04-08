import Stripe from "stripe";

/**
 * True if the customer has an active or trialing subscription whose items include `priceId`.
 */
export async function customerHasSubscriptionPrice(
  stripeCustomerId: string | null | undefined,
  priceId: string | null | undefined
): Promise<boolean> {
  if (!stripeCustomerId?.trim() || !priceId?.trim()) return false;
  if (stripeCustomerId.trim() === "manual_override") return true;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return false;

  const stripe = new Stripe(secret);
  const cid = stripeCustomerId.trim();
  const pid = priceId.trim();

  try {
    for (const status of ["active", "trialing"] as const) {
      const subs = await stripe.subscriptions.list({
        customer: cid,
        status,
        limit: 20,
      });
      for (const sub of subs.data) {
        for (const item of sub.items.data) {
          const p = item.price?.id;
          if (p === pid) return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function userHasPlatoonAddon(
  stripeCustomerId: string | null | undefined
): Promise<boolean> {
  const id = process.env.STRIPE_PLATOON_PRICE_ID?.trim();
  if (!id) return false;
  return customerHasSubscriptionPrice(stripeCustomerId, id);
}

export async function userHasCompanyAddon(
  stripeCustomerId: string | null | undefined
): Promise<boolean> {
  const id = process.env.STRIPE_COMPANY_PRICE_ID?.trim();
  if (!id) return false;
  return customerHasSubscriptionPrice(stripeCustomerId, id);
}
