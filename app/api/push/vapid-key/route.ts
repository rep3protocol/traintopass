import { NextResponse } from "next/server";

/** Public VAPID key for client subscription (same as VAPID_PUBLIC_KEY). */
export function GET() {
  const key = process.env.VAPID_PUBLIC_KEY?.trim() ?? null;
  return NextResponse.json({ publicKey: key });
}
