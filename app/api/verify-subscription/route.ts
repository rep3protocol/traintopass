import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ active: false });
  }

  try {
    const active = await getUserSubscriptionPaid(session.user.id);
    return NextResponse.json({ active });
  } catch {
    return NextResponse.json({ active: false });
  }
}
