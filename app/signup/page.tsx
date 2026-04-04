"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not create account.");
        return;
      }

      router.push("/login?registered=true");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onGoogle() {
    setGoogleBusy(true);
    void signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md border border-forge-border bg-forge-panel p-8 space-y-8">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl text-white tracking-wide">
              Create Account
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
              or register
            </span>
            <div className="flex-1 h-px bg-forge-border" />
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {error ? (
              <p className="text-sm text-red-400 border border-red-900/40 bg-red-950/20 px-3 py-2">
                {error}
              </p>
            ) : null}
            <div>
              <label
                htmlFor="signup-name"
                className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5"
              >
                Name
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
            </div>
            <div>
              <label
                htmlFor="signup-email"
                className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5"
              >
                Email
              </label>
              <input
                id="signup-email"
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
                htmlFor="signup-password"
                className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5"
              >
                Password (min 8 characters)
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
            </div>
            <div>
              <label
                htmlFor="signup-confirm"
                className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5"
              >
                Confirm password
              </label>
              <input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full border-2 border-forge-accent bg-forge-accent px-6 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
            >
              {busy ? "Creating…" : "Create Account"}
            </button>
          </form>

          <p className="text-sm text-neutral-500 text-center">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-forge-accent hover:underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
