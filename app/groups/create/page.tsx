import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CreateUnitForm } from "@/components/groups/create-unit-form";
import { isUuidParam } from "@/lib/group-route-helpers";
import { isUnitType } from "@/lib/unit-types";
import { getUserSubscriptionPaid, getUserStripeCustomerId } from "@/lib/user-subscription";
import {
  userHasPlatoonAddon,
  userHasCompanyAddon,
} from "@/lib/stripe-unit-addons";

function firstSearchParam(
  v: string | string[] | undefined
): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function CreateUnitPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const paid = await getUserSubscriptionPaid(session.user.id);
  const cid = await getUserStripeCustomerId(session.user.id);
  const [platoonAddon, companyAddon] = await Promise.all([
    userHasPlatoonAddon(cid),
    userHasCompanyAddon(cid),
  ]);

  const typeRaw = firstSearchParam(searchParams.type);
  const parentRaw = firstSearchParam(searchParams.parentId);
  const initialUnitType = isUnitType(typeRaw) ? typeRaw : undefined;
  const initialParentId =
    initialUnitType &&
    initialUnitType !== "company" &&
    parentRaw &&
    isUuidParam(parentRaw)
      ? parentRaw
      : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-8">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            CREATE UNIT
          </h1>
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed max-w-lg">
            Choose squad, platoon, or company. Higher tiers require the matching
            add-on after Pro. Members only need a free account to join with your
            code.
          </p>
          <p className="mt-4 text-xs text-neutral-400 border border-forge-border/60 bg-forge-panel px-4 py-3 max-w-lg leading-relaxed">
            Recommended order: Create a Company first, then Platoons, then
            Squads.
          </p>
        </div>
        <CreateUnitForm
          paid={paid}
          initialPlatoonAddon={platoonAddon}
          initialCompanyAddon={companyAddon}
          initialUnitType={initialUnitType}
          initialParentId={initialParentId}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
