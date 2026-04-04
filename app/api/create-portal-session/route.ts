import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Stripe from "stripe";
import { getUserStripeCustomerId } from "@/lib/user-subscription";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const customerId = await getUserStripeCustomerId(session.user.id);
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing account on file yet." },
      { status: 400 }
    );
  }

  const stripe = new Stripe(secret);
  const origin = new URL(req.url).origin;

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    if (!portal.url) {
      return NextResponse.json({ error: "Portal URL missing" }, { status: 500 });
    }
    return NextResponse.json({ url: portal.url });
  } catch {
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
