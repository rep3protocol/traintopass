import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { AccountActions } from "@/components/account-actions";
import { AccountBillingPanel } from "@/components/account-billing-panel";
import { AccountIdentityCard } from "@/components/account-identity-card";
import { AccountLimitations } from "@/components/account-limitations";
import { AccountNotificationSettings } from "@/components/account-notification-settings";
import { AccountReferralSection } from "@/components/account-referral-section";
import { MilitaryRankSettings } from "@/components/military-rank-settings";
import { ProfilePublicToggle } from "@/components/profile-public-toggle";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { fetchAccountStripeBilling } from "@/lib/account-billing";
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
  const billing = await fetchAccountStripeBilling(stripeCustomerId);

  let profilePublic = true;
  let militaryRank: string | null = null;
  let referralCode: string | null = null;
  let completedReferred = 0;
  let displayName = session.user.name?.trim() || "—";
  let displayEmail = session.user.email ?? "—";
  let freeMonthsRemaining = 0;
  let unitName: string | null = null;

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (dbUrl) {
    try {
      const sql = neon(dbUrl);
      const rows = (await sql`
        SELECT
          u.name,
          u.email,
          u.profile_public,
          u.referral_code,
          u.military_rank,
          u.free_months_credited,
          (
            SELECT g.name
            FROM group_members gm
            INNER JOIN "groups" g ON g.id = gm.group_id
            WHERE gm.user_id = u.id
            ORDER BY gm.joined_at ASC
            LIMIT 1
          ) AS first_group_name
        FROM users u
        WHERE u.id = ${session.user.id}::uuid
      `) as {
        name: string | null;
        email: string | null;
        profile_public: boolean | null;
        referral_code: string | null;
        military_rank: string | null;
        free_months_credited: number | null;
        first_group_name: string | null;
      }[];
      const row = rows[0];
      if (row?.profile_public === false) profilePublic = false;
      {
        const raw =
          typeof row?.military_rank === "string"
            ? row.military_rank.trim() || null
            : null;
        militaryRank = raw === "CDT" ? "Cadet" : raw;
      }
      referralCode =
        typeof row?.referral_code === "string"
          ? row.referral_code.trim()
          : null;
      if (typeof row?.name === "string" && row.name.trim() !== "") {
        displayName = row.name.trim();
      }
      if (typeof row?.email === "string" && row.email.trim() !== "") {
        displayEmail = row.email.trim();
      }
      freeMonthsRemaining = Math.max(0, Number(row?.free_months_credited ?? 0));
      if (typeof row?.first_group_name === "string" && row.first_group_name.trim()) {
        unitName = row.first_group_name.trim();
      }
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
        SELECT COUNT(*) FILTER (WHERE status = 'completed')::int AS done
        FROM referrals
        WHERE referrer_id = ${session.user.id}::uuid
      `) as { done: number }[];
      completedReferred = Number(stats[0]?.done ?? 0);
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
          <div className="mt-6">
            <AccountIdentityCard
              name={displayName}
              email={displayEmail}
              militaryRank={militaryRank}
              unitName={unitName}
              paid={paid}
              freeMonthsRemaining={freeMonthsRemaining}
            />
          </div>
        </div>

        <ProfilePublicToggle initialPublic={profilePublic} />

        <MilitaryRankSettings initialRank={militaryRank} />

        <AccountLimitations />

        {referralLink ? (
          <AccountReferralSection
            referralLink={referralLink}
            completedReferred={completedReferred}
          />
        ) : null}

        <AccountNotificationSettings />

        <AccountBillingPanel
          nextBillingDate={billing.nextBillingDate}
          plan={billing.plan}
          paid={paid}
          canOpenBillingPortal={!!stripeCustomerId}
        />

        <AccountActions />
      </main>
      <SiteFooter />
    </div>
  );
}
