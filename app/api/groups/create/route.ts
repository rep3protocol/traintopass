import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import { getUserSubscriptionPaid, getUserStripeCustomerId } from "@/lib/user-subscription";
import {
  insertGroupWithLeader,
} from "@/lib/group-create-shared";
import {
  isUnitType,
  type UnitType,
} from "@/lib/unit-types";
import {
  userHasPlatoonAddon,
  userHasCompanyAddon,
} from "@/lib/stripe-unit-addons";

export const dynamic = "force-dynamic";

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

  const unitType: UnitType = isUnitType(body.unitType)
    ? body.unitType
    : "squad";

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

  const stripeCustomerId = await getUserStripeCustomerId(session.user.id);

  if (unitType === "platoon") {
    const ok = await userHasPlatoonAddon(stripeCustomerId);
    if (!ok) {
      return NextResponse.json(
        {
          error: "Platoon add-on required",
          needsAddonCheckout: true,
          addon: "platoon",
        },
        { status: 402 }
      );
    }
  }

  if (unitType === "company") {
    const ok = await userHasCompanyAddon(stripeCustomerId);
    if (!ok) {
      return NextResponse.json(
        {
          error: "Company add-on required",
          needsAddonCheckout: true,
          addon: "company",
        },
        { status: 402 }
      );
    }
  }

  const sql = neon(url);
  const leaderId = session.user.id;

  const result = await insertGroupWithLeader(sql, {
    name,
    leaderId,
    unitType,
    parentGroupId,
    creationCheckoutSessionId: null,
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
}
