import { notFound, redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UnitLeaderboard } from "@/components/groups/unit-leaderboard";
import { UnitPanelClient } from "@/components/groups/unit-panel-client";
import { UnitSubUnits, type SubUnitRow } from "@/components/groups/unit-sub-units";
import { isUuidParam } from "@/lib/group-route-helpers";
import { fetchChildGroups } from "@/lib/group-subtree";
import { getGroupTreeAverageScore } from "@/lib/group-average-score";
import { isUnitType, unitTypeLabel, type UnitType } from "@/lib/unit-types";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} ${time} UTC`;
}

type PageProps = { params: { id: string } };

export default async function GroupDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const groupId = params.id;
  if (!isUuidParam(groupId)) notFound();

  const uid = session.user.id;
  const url = process.env.DATABASE_URL?.trim();

  if (!url) notFound();

  type GroupRow = {
    id: string;
    name: string;
    join_code: string;
    leader_id: string;
    aft_test_date: string | null;
    weekly_challenge_score: number | null;
    member_count: number;
    unit_type: string | null;
    parent_name: string | null;
  };

  let row: GroupRow | null = null;

  try {
    const sql = neon(url);
    const raw = await sql`
      SELECT
        g.id::text,
        g.name,
        g.join_code,
        g.leader_id::text,
        g.aft_test_date,
        g.weekly_challenge_score,
        g.unit_type::text AS unit_type,
        pg.name AS parent_name,
        (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
      FROM group_members me
      INNER JOIN "groups" g ON g.id = me.group_id
      LEFT JOIN "groups" pg ON pg.id = g.parent_group_id
      WHERE me.user_id = ${uid}::uuid AND g.id = ${groupId}::uuid
      LIMIT 1
    `;
    const rawRows = raw as GroupRow[];
    row = rawRows[0] ?? null;
  } catch {
    row = null;
  }

  if (!row) notFound();

  const unitType: UnitType = isUnitType(row.unit_type) ? row.unit_type : "squad";
  const isLeader = row.leader_id === uid;
  const joinCode = isLeader ? row.join_code : null;
  const aft =
    row.aft_test_date != null
      ? String(row.aft_test_date).slice(0, 10)
      : null;

  let challengeHits = 0;
  if (row.weekly_challenge_score != null) {
    const target = Number(row.weekly_challenge_score);
    try {
      const sql = neon(url);
      const hit = await sql`
        WITH RECURSIVE subtree AS (
          SELECT id FROM "groups" WHERE id = ${groupId}::uuid
          UNION ALL
          SELECT g.id FROM "groups" g
          INNER JOIN subtree s ON g.parent_group_id = s.id
        ),
        bests AS (
          SELECT sh.user_id, MAX(sh.total_score) AS best
          FROM score_history sh
          INNER JOIN group_members gm
            ON gm.user_id = sh.user_id AND gm.group_id IN (SELECT id FROM subtree)
          GROUP BY sh.user_id
        )
        SELECT COUNT(*)::int AS c FROM bests WHERE best >= ${target}
      `;
      challengeHits = Number((hit as { c: number }[])[0]?.c ?? 0);
    } catch {
      challengeHits = 0;
    }
  }

  let announcements: { id: string; message: string; createdAt: string }[] =
    [];
  try {
    const sql = neon(url);
    const ann = await sql`
      SELECT id::text, message, created_at
      FROM group_announcements
      WHERE group_id = ${groupId}::uuid
      ORDER BY created_at DESC
      LIMIT 5
    `;
    announcements = (ann as { id: string; message: string; created_at: string }[]).map(
      (a) => ({
        id: a.id,
        message: a.message,
        createdAt: formatDateTime(String(a.created_at ?? "")),
      })
    );
  } catch {
    announcements = [];
  }

  let subUnits: SubUnitRow[] = [];
  if (unitType === "company" || unitType === "platoon") {
    try {
      const children = await fetchChildGroups(url, groupId);
      subUnits = await Promise.all(
        children.map(async (c) => ({
          id: c.id,
          name: c.name,
          unitType: c.unit_type,
          averageScore: await getGroupTreeAverageScore(url, c.id),
        }))
      );
    } catch {
      subUnits = [];
    }
  }

  const lbHeading =
    unitType === "company"
      ? "COMPANY LEADERBOARD"
      : unitType === "platoon"
        ? "PLATOON LEADERBOARD"
        : "UNIT LEADERBOARD";

  const subTitle =
    unitType === "company"
      ? "Platoons & squads"
      : unitType === "platoon"
        ? "Squads"
        : "";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-6xl mx-auto w-full">
        <div className="mb-6 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest border border-forge-accent text-forge-accent px-2 py-0.5">
              {unitTypeLabel(unitType)}
            </span>
            <span className="text-xs text-neutral-500">
              {unitType === "squad"
                ? "Up to 15 members"
                : unitType === "platoon"
                  ? "Up to 60 members"
                  : "Up to 250 members"}
            </span>
          </div>
          {row.parent_name ? (
            <p className="text-sm text-neutral-400">
              Under:{" "}
              <span className="text-neutral-200">{row.parent_name}</span>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start">
          <div className="space-y-8">
            <UnitPanelClient
              groupId={groupId}
              isLeader={isLeader}
              groupName={row.name}
              joinCode={joinCode}
              memberCount={Number(row.member_count ?? 0)}
              aftTestDate={aft}
              weeklyChallengeScore={
                row.weekly_challenge_score != null
                  ? Number(row.weekly_challenge_score)
                  : null
              }
              challengeHits={challengeHits}
              initialAnnouncements={announcements}
            />
            {unitType === "company" || unitType === "platoon" ? (
              <UnitSubUnits title={subTitle} units={subUnits} />
            ) : null}
          </div>
          <UnitLeaderboard
            groupId={groupId}
            isLeader={isLeader}
            heading={lbHeading}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
