import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchAccountStripeBilling } from "@/lib/account-billing";
import { getUserStripeCustomerId } from "@/lib/user-subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = await getUserStripeCustomerId(session.user.id);
  const info = await fetchAccountStripeBilling(customerId);
  return NextResponse.json(info);
}
