"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const registered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onGoogle() {
    setGoogleBusy(true);
    void signIn("google", { callbackUrl });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md border border-forge-border bg-forge-panel p-8 space-y-8">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl text-white tracking-wide">
              Sign In
            </h1>
            <p className="mt-2 text-xs text-neutral-500 uppercase tracking-widest">
              Train to Pass
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoogle()}
            disabled={googleBusy}
            className="w-full border border-forge-border bg-forge-bg px-4 py-3 text-sm font-semibold uppercase tracking-widest text-neutral-200 hover:border-forge-accent hover:text-forge-accent disabled:opacity-50 transition-colors"
          >
            {googleBusy ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-forge-border" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-600">
              or email
            </span>
            <div className="flex-1 h-px bg-forge-border" />
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {registered ? (
              <p className="text-sm text-green-400 border border-green-900/40 bg-green-950/20 px-3 py-2">
                Account created! Please sign in.
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-red-400 border border-red-900/40 bg-red-950/20 px-3 py-2">
                {error}
              </p>
            ) : null}
            <div>
              <label
                htmlFor="login-email"
                className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full border-2 border-forge-accent bg-forge-accent px-6 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-neutral-500 text-center">
            No account?{" "}
            <Link
              href="/signup"
              className="text-forge-accent hover:underline underline-offset-2"
            >
              Create one
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
