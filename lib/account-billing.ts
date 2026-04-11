import Stripe from "stripe";

export type AccountBillingInfo = {
  nextBillingDate: string | null;
  plan: string | null;
};

export async function fetchAccountStripeBilling(
  customerId: string | null | undefined
): Promise<AccountBillingInfo> {
  const id =
    typeof customerId === "string" && customerId.trim() !== ""
      ? customerId.trim()
      : null;
  if (!id) {
    return { nextBillingDate: null, plan: null };
  }
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return { nextBillingDate: null, plan: null };
  }
  const stripe = new Stripe(secret);
  try {
    const subs = await stripe.subscriptions.list({
      customer: id,
      status: "active",
      limit: 1,
    });
    const sub = subs.data[0];
    const raw = sub as unknown as {
      current_period_end?: number;
      currentPeriodEnd?: number;
    };
    const periodEnd = raw.current_period_end ?? raw.currentPeriodEnd;
    if (periodEnd == null || typeof periodEnd !== "number") {
      return { nextBillingDate: null, plan: null };
    }
    return {
      nextBillingDate: new Date(periodEnd * 1000).toISOString(),
      plan: "Pro",
    };
  } catch {
    return { nextBillingDate: null, plan: null };
  }
}
