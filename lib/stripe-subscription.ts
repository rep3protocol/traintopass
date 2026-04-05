import Stripe from "stripe";

/**
 * Stripe subscription status only (no referral free months).
 * Complimentary access from referrals is handled in {@link getUserSubscriptionPaid}.
 */
export async function hasActiveStripeSubscription(
  stripeCustomerId: string | null | undefined
): Promise<boolean> {
  if (!stripeCustomerId?.trim()) return false;
  if (stripeCustomerId.trim() === "manual_override") return true;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return false;

  const stripe = new Stripe(secret);
  try {
    const list = await stripe.subscriptions.list({
      customer: stripeCustomerId.trim(),
      status: "active",
      limit: 1,
    });
    if (list.data.length > 0) return true;
    const trialing = await stripe.subscriptions.list({
      customer: stripeCustomerId.trim(),
      status: "trialing",
      limit: 1,
    });
    return trialing.data.length > 0;
  } catch {
    return false;
  }
}
