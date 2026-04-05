import { notFound, redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UnitLeaderboard } from "@/components/groups/unit-leaderboard";
import { UnitPanelClient } from "@/components/groups/unit-panel-client";
import { isUuidParam } from "@/lib/group-route-helpers";

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
        (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
      FROM group_members me
      INNER JOIN "groups" g ON g.id = me.group_id
      WHERE me.user_id = ${uid}::uuid AND g.id = ${groupId}::uuid
      LIMIT 1
    `;
    const rawRows = raw as GroupRow[];
    row = rawRows[0] ?? null;
  } catch {
    row = null;
  }

  if (!row) notFound();

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
        WITH bests AS (
          SELECT sh.user_id, MAX(sh.total_score) AS best
          FROM score_history sh
          INNER JOIN group_members gm
            ON gm.user_id = sh.user_id AND gm.group_id = ${groupId}::uuid
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

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start">
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
          <UnitLeaderboard groupId={groupId} isLeader={isLeader} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
