"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { LS_REFERRAL_CODE_KEY } from "@/lib/storage-keys";

/** Applies referral code from localStorage once after login (email or OAuth). */
export function ReferralApplyClient() {
  const { data: session, status } = useSession();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || ran.current) return;
    let code: string | null = null;
    try {
      code = localStorage.getItem(LS_REFERRAL_CODE_KEY);
    } catch {
      return;
    }
    if (!code?.trim()) return;
    ran.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/referrals/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code!.trim() }),
        });
        if (res.ok) {
          try {
            localStorage.removeItem(LS_REFERRAL_CODE_KEY);
          } catch {
            /* silent */
          }
        }
      } catch {
        /* silent */
      }
    })();
  }, [status, session?.user]);

  return null;
}
