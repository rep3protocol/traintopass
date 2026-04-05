import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChallengePageClient } from "@/components/challenge-page-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPersonalChallengeLine } from "@/lib/personal-challenge";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

export default async function ChallengePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const paid = await getUserSubscriptionPaid(session.user.id);
  let personalLine: string | null = null;
  if (paid) {
    try {
      personalLine = await getPersonalChallengeLine(session.user.id);
    } catch {
      personalLine = null;
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-2xl mx-auto w-full space-y-8">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            Daily Challenge
          </h1>
          <p className="mt-2 text-xs text-neutral-500 uppercase tracking-widest">
            Train to Pass
          </p>
        </div>
        <ChallengePageClient paid={paid} personalLine={personalLine} />
      </main>
      <SiteFooter />
    </div>
  );
}
