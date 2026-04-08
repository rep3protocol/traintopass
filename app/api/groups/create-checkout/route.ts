import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import { getUserSubscriptionPaid, getUserStripeCustomerId } from "@/lib/user-subscription";
import { isUnitType, type UnitType } from "@/lib/unit-types";
import { validateParentForLeader } from "@/lib/group-create-shared";

export const dynamic = "force-dynamic";

const FLOW = "unit_addon_create";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paid = await getUserSubscriptionPaid(session.user.id);
  if (!paid) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  let body: {
    name?: string;
    unitType?: string;
    parentGroupId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const unitType: UnitType = isUnitType(body.unitType) ? body.unitType : "squad";
  if (unitType !== "platoon" && unitType !== "company") {
    return NextResponse.json({ error: "Invalid unit type for checkout" }, { status: 400 });
  }

  const priceId =
    unitType === "platoon"
      ? process.env.STRIPE_PLATOON_PRICE_ID?.trim()
      : process.env.STRIPE_COMPANY_PRICE_ID?.trim();

  if (!priceId) {
    return NextResponse.json(
      { error: "Missing Stripe price configuration" },
      { status: 503 }
    );
  }

  let parentGroupId: string | null =
    typeof body.parentGroupId === "string" && body.parentGroupId.trim() !== ""
      ? body.parentGroupId.trim()
      : null;

  if (unitType === "company") {
    parentGroupId = null;
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const sql = neon(url);
  const leaderId = session.user.id;

  if (parentGroupId) {
    const v = await validateParentForLeader(sql, leaderId, parentGroupId, unitType);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secret);
  const origin = new URL(req.url).origin;
  const stripeCustomerId = await getUserStripeCustomerId(leaderId);

  const metadata: Record<string, string> = {
    userId: leaderId,
    flow: FLOW,
    unitType,
    name,
    parentGroupId: parentGroupId ?? "",
  };

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/groups/create?session_id={CHECKOUT_SESSION_ID}&unlocked=true`,
      cancel_url: `${origin}/groups/create`,
      metadata,
      client_reference_id: leaderId,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Checkout session missing URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
