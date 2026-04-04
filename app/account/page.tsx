import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountActions } from "@/components/account-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  getUserStripeCustomerId,
  getUserSubscriptionPaid,
} from "@/lib/user-subscription";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const paid = await getUserSubscriptionPaid(session.user.id);
  const stripeCustomerId = await getUserStripeCustomerId(session.user.id);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-2xl mx-auto w-full space-y-10">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            Account
          </h1>
          <p className="mt-6 text-sm text-neutral-400">
            <span className="text-neutral-500">Name:</span>{" "}
            {session.user.name?.trim() || "—"}
          </p>
          <p className="mt-2 text-sm text-neutral-400">
            <span className="text-neutral-500">Email:</span>{" "}
            {session.user.email ?? "—"}
          </p>
          <p className="mt-4 text-xs uppercase tracking-widest text-neutral-600">
            Subscription:{" "}
            <span className={paid ? "text-forge-accent" : "text-neutral-400"}>
              {paid ? "Paid" : "Free"}
            </span>
          </p>
        </div>

        <AccountActions canOpenBillingPortal={!!stripeCustomerId} />
      </main>
      <SiteFooter />
    </div>
  );
}
