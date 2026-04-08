import type { ComponentProps } from "react";
import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { GroupsHub } from "@/components/groups/groups-hub";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";
import { countDescendantsByUnitType } from "@/lib/group-subtree";
import { isUnitType, type UnitType } from "@/lib/unit-types";

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const paid = await getUserSubscriptionPaid(session.user.id);
  const uid = session.user.id;

  let initialGroups: ComponentProps<typeof GroupsHub>["initialGroups"] = [];

  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    try {
      const sql = neon(url);
      const raw = await sql`
        SELECT
          g.id::text,
          g.name,
          g.join_code,
          g.leader_id::text,
          g.unit_type::text AS unit_type,
          pg.name AS parent_name,
          (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
        FROM group_members me
        INNER JOIN "groups" g ON g.id = me.group_id
        LEFT JOIN "groups" pg ON pg.id = g.parent_group_id
        WHERE me.user_id = ${uid}::uuid
        ORDER BY g.created_at ASC
      `;
      const rows = raw as {
        id: string;
        name: string;
        join_code: string;
        leader_id: string;
        unit_type: string | null;
        parent_name: string | null;
        member_count: number;
      }[];

      for (const r of rows) {
        const unitType: UnitType = isUnitType(r.unit_type)
          ? r.unit_type
          : "squad";
        let descendantPlatoons: number | undefined;
        let descendantSquads: number | undefined;
        if (unitType === "company") {
          const c = await countDescendantsByUnitType(url, r.id);
          descendantPlatoons = c.platoon;
          descendantSquads = c.squad;
        }
        initialGroups.push({
          id: r.id,
          name: r.name,
          joinCode: r.leader_id === uid ? r.join_code : null,
          memberCount: Number(r.member_count ?? 0),
          isLeader: r.leader_id === uid,
          unitType,
          parentName: r.parent_name,
          descendantPlatoons,
          descendantSquads,
        });
      }
    } catch {
      initialGroups = [];
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-8">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl text-white tracking-wide">
            UNITS
          </h1>
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
            Train with your squad, platoon, or company. Share a join code, track
            leaderboards, and post targets for the team.
          </p>
        </div>
        <GroupsHub initialGroups={initialGroups} paid={paid} />
      </main>
      <SiteFooter />
    </div>
  );
}
