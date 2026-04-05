import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPatches } from "@/lib/award-patches";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ patches: [] });
  }
  try {
    const patches = await getUserPatches(session.user.id);
    return NextResponse.json({ patches });
  } catch {
    return NextResponse.json({ patches: [] });
  }
}
