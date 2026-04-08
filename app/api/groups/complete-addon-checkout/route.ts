import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import { insertGroupWithLeader } from "@/lib/group-create-shared";
import { isUnitType, type UnitType } from "@/lib/unit-types";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";
import { creditReferrerOnFirstPayment } from "@/lib/referrals";

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

  let session_id: string;
  try {
    const body = (await req.json()) as { session_id?: string };
    session_id = typeof body.session_id === "string" ? body.session_id : "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!session_id || !session_id.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secret);

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
    const ok =
      checkoutSession.status === "complete" &&
      checkoutSession.payment_status === "paid";

    if (!ok) {
      return NextResponse.json({ error: "Payment not complete" }, { status: 400 });
    }

    if (checkoutSession.metadata?.flow !== FLOW) {
      return NextResponse.json({ error: "Invalid checkout session" }, { status: 400 });
    }

    const userId = checkoutSession.metadata?.userId;
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawType = checkoutSession.metadata?.unitType;
    const unitType: UnitType | null = isUnitType(rawType) ? rawType : null;
    if (!unitType || (unitType !== "platoon" && unitType !== "company")) {
      return NextResponse.json({ error: "Invalid unit metadata" }, { status: 400 });
    }

    const name = typeof checkoutSession.metadata?.name === "string"
      ? checkoutSession.metadata.name.trim()
      : "";
    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const parentRaw = checkoutSession.metadata?.parentGroupId?.trim();
    const parentGroupId: string | null = parentRaw ? parentRaw : null;

    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    }

    const sql = neon(url);

    const existing = await sql`
      SELECT id::text FROM "groups"
      WHERE creation_checkout_session_id = ${session_id}
      LIMIT 1
    `;
    const existingRow = (existing as { id: string }[])[0];
    if (existingRow?.id) {
      return NextResponse.json({
        group: {
          id: existingRow.id,
          alreadyCreated: true,
        },
      });
    }

    let customerId: string | null = null;
    if (typeof checkoutSession.customer === "string") {
      customerId = checkoutSession.customer;
    } else if (
      checkoutSession.customer &&
      typeof checkoutSession.customer === "object" &&
      "id" in checkoutSession.customer
    ) {
      customerId = (checkoutSession.customer as Stripe.Customer).id;
    }

    if (customerId) {
      try {
        await sql`
          UPDATE users
          SET stripe_customer_id = ${customerId}
          WHERE id = ${session.user.id}::uuid
        `;
      } catch {
        /* silent */
      }
      try {
        await creditReferrerOnFirstPayment(session.user.id);
      } catch {
        /* silent */
      }
    }

    const result = await insertGroupWithLeader(sql, {
      name,
      leaderId: session.user.id,
      unitType,
      parentGroupId: unitType === "company" ? null : parentGroupId,
      creationCheckoutSessionId: session_id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      group: {
        id: result.id,
        name: result.name,
        joinCode: result.join_code,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to complete" }, { status: 500 });
  }
}
