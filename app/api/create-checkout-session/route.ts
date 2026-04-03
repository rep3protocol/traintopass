import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secret);
  const origin = new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Train to Pass — Full Plan",
            },
            unit_amount: 700,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/results?session_id={CHECKOUT_SESSION_ID}&unlocked=true`,
      cancel_url: `${origin}/results`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout session missing URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
