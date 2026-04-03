import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { unlocked: false, error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  let session_id: string;
  try {
    const body = (await req.json()) as { session_id?: string };
    session_id = typeof body.session_id === "string" ? body.session_id : "";
  } catch {
    return NextResponse.json({ unlocked: false }, { status: 400 });
  }

  if (!session_id || !session_id.startsWith("cs_")) {
    return NextResponse.json({ unlocked: false }, { status: 400 });
  }

  const stripe = new Stripe(secret);

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const ok =
      session.status === "complete" && session.payment_status === "paid";
    return NextResponse.json({ unlocked: ok });
  } catch {
    return NextResponse.json({ unlocked: false });
  }
}
