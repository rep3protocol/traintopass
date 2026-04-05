"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LS_REFERRAL_CODE_KEY } from "@/lib/storage-keys";

function JoinInner() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref")?.trim() ?? "";

  useEffect(() => {
    if (!ref) return;
    try {
      localStorage.setItem(LS_REFERRAL_CODE_KEY, ref.toUpperCase());
    } catch {
      /* silent */
    }
  }, [ref]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg border border-forge-border bg-forge-panel p-8 sm:p-10 space-y-8 text-center">
        <h1 className="font-heading text-3xl sm:text-4xl text-white tracking-wide">
          Your friend invited you to Train to Pass
        </h1>
        <p className="text-sm text-neutral-300 leading-relaxed">
          You&apos;ll get your first month free when you subscribe.
        </p>
        <Link
          href="/signup"
          className="inline-block border-2 border-forge-accent bg-forge-accent px-10 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
        >
          Sign Up Free →
        </Link>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
            Loading…
          </div>
        }
      >
        <JoinInner />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
