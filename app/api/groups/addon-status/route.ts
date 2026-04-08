import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserStripeCustomerId } from "@/lib/user-subscription";
import {
  userHasPlatoonAddon,
  userHasCompanyAddon,
} from "@/lib/stripe-unit-addons";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cid = await getUserStripeCustomerId(session.user.id);
  const [platoon, company] = await Promise.all([
    userHasPlatoonAddon(cid),
    userHasCompanyAddon(cid),
  ]);

  return NextResponse.json({ platoon, company });
}
