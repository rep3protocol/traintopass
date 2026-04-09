import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { AccountActions } from "@/components/account-actions";
import { AccountNotificationSettings } from "@/components/account-notification-settings";
import { AccountReferralSection } from "@/components/account-referral-section";
import { MilitaryRankSettings } from "@/components/military-rank-settings";
import { ProfilePublicToggle } from "@/components/profile-public-toggle";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { generateUniqueUserReferralCode } from "@/lib/referral-code";
import {
  getUserStripeCustomerId,
  getUserSubscriptionPaid,
} from "@/lib/user-subscription";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const paid = await getUserSubscriptionPaid(session.user.id);
  const stripeCustomerId = await getUserStripeCustomerId(session.user.id);

  let profilePublic = true;
  let militaryRank: string | null = null;
  let referralCode: string | null = null;
  let totalReferred = 0;
  let completedReferred = 0;
  let pendingReferred = 0;

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (dbUrl) {
    try {
      const sql = neon(dbUrl);
      const rows = (await sql`
        SELECT profile_public, referral_code, military_rank
        FROM users WHERE id = ${session.user.id}::uuid
      `) as {
        profile_public: boolean | null;
        referral_code: string | null;
        military_rank: string | null;
      }[];
      if (rows[0]?.profile_public === false) profilePublic = false;
      militaryRank =
        typeof rows[0]?.military_rank === "string"
          ? rows[0].military_rank.trim() || null
          : null;
      referralCode =
        typeof rows[0]?.referral_code === "string"
          ? rows[0].referral_code.trim()
          : null;
      if (!referralCode) {
        try {
          const code = await generateUniqueUserReferralCode();
          await sql`
            UPDATE users
            SET referral_code = ${code}
            WHERE id = ${session.user.id}::uuid
              AND (referral_code IS NULL OR referral_code = '')
          `;
          referralCode = code;
        } catch {
          /* silent */
        }
      }
    } catch {
      /* silent */
    }
    try {
      const sql = neon(dbUrl);
      const stats = (await sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS done,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
        FROM referrals
        WHERE referrer_id = ${session.user.id}::uuid
      `) as { total: number; done: number; pending: number }[];
      totalReferred = Number(stats[0]?.total ?? 0);
      completedReferred = Number(stats[0]?.done ?? 0);
      pendingReferred = Number(stats[0]?.pending ?? 0);
    } catch {
      /* silent */
    }
  }

  const referralLink = referralCode
    ? `https://traintopass.com/join?ref=${encodeURIComponent(referralCode)}`
    : "";

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

        <ProfilePublicToggle initialPublic={profilePublic} />

        <MilitaryRankSettings initialRank={militaryRank} />

        {referralLink ? (
          <AccountReferralSection
            referralLink={referralLink}
            totalReferred={totalReferred}
            completedReferred={completedReferred}
            pendingReferred={pendingReferred}
            monthsEarned={completedReferred}
          />
        ) : null}

        <AccountNotificationSettings />

        <AccountActions canOpenBillingPortal={!!stripeCustomerId} />
      </main>
      <SiteFooter />
    </div>
  );
}
