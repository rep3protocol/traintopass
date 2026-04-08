import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isHistoryOverallPass } from "@/lib/history";
import {
  buildGroupAverageByDay,
  weakEventLabelsBelow,
  type ScoreDayRow,
} from "@/lib/groups";
import { isUuidParam } from "@/lib/group-route-helpers";
import { EVENT_ORDER, type EventKey } from "@/lib/aft-scoring";
import { effectiveRank, parseRankId, rankDisplayGrade, type RankId } from "@/lib/ranks";
import { hasActiveStripeSubscription } from "@/lib/stripe-subscription";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);
  const groupId = params.id;
  if (!isUuidParam(groupId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({
      leaderboard: [],
      averageScore: 0,
      chart: [] as { date: string; avg: number }[],
    });
  }

  const sql = neon(url);
  const uid = session.user.id;

  try {
    const mem = await sql`
      SELECT 1 FROM group_members
      WHERE group_id = ${groupId}::uuid AND user_id = ${uid}::uuid
      LIMIT 1
    `;
    if ((mem as unknown[]).length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membersRaw = await sql`
      WITH RECURSIVE subtree AS (
        SELECT id FROM "groups" WHERE id = ${groupId}::uuid
        UNION ALL
        SELECT g.id FROM "groups" g
        INNER JOIN subtree s ON g.parent_group_id = s.id
      )
      SELECT DISTINCT ON (gm.user_id)
        gm.user_id::text AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.current_rank,
        u.stripe_customer_id
      FROM group_members gm
      INNER JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id IN (SELECT id FROM subtree)
      ORDER BY gm.user_id
    `;

    const members = membersRaw as {
      user_id: string;
      user_name: string | null;
      user_email: string | null;
      current_rank: string | null;
      stripe_customer_id: string | null;
    }[];

    const customerIds = Array.from(
      new Set(
        members
          .map((m) => m.stripe_customer_id?.trim())
          .filter((x): x is string => !!x)
      )
    );
    const customerPaid = new Map<string, boolean>();
    await Promise.all(
      customerIds.map(async (cid) => {
        const ok = await hasActiveStripeSubscription(cid);
        customerPaid.set(cid, ok);
      })
    );

    const paidByUserId = new Map<string, boolean>();
    for (const m of members) {
      const cid = m.stripe_customer_id?.trim();
      paidByUserId.set(m.user_id, cid ? !!customerPaid.get(cid) : false);
    }

    const ranked = await sql`
      WITH RECURSIVE subtree AS (
        SELECT id FROM "groups" WHERE id = ${groupId}::uuid
        UNION ALL
        SELECT g.id FROM "groups" g
        INNER JOIN subtree s ON g.parent_group_id = s.id
      ),
      ranked AS (
        SELECT
          sh.user_id,
          sh.total_score,
          sh.age_group,
          sh.gender,
          sh.event_scores,
          sh.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY sh.user_id
            ORDER BY sh.total_score DESC, sh.created_at DESC
          ) AS rn
        FROM score_history sh
        INNER JOIN group_members gm
          ON gm.user_id = sh.user_id AND gm.group_id IN (SELECT id FROM subtree)
      )
      SELECT
        r.user_id::text,
        r.total_score,
        r.age_group,
        r.gender,
        r.event_scores,
        r.created_at
      FROM ranked r
      WHERE r.rn = 1
    `;

    const bestByUser = new Map<
      string,
      {
        total_score: number;
        age_group: string;
        gender: string;
        event_scores: Record<string, unknown>;
        created_at: string | Date;
      }
    >();
    for (const r of ranked as {
      user_id: string;
      total_score: number;
      age_group: string;
      gender: string;
      event_scores: Record<string, unknown>;
      created_at: string | Date;
    }[]) {
      bestByUser.set(r.user_id, {
        total_score: Number(r.total_score ?? 0),
        age_group: String(r.age_group ?? ""),
        gender: String(r.gender ?? ""),
        event_scores:
          r.event_scores && typeof r.event_scores === "object"
            ? r.event_scores
            : {},
        created_at: r.created_at,
      });
    }

    const historyRows = await sql`
      WITH RECURSIVE subtree AS (
        SELECT id FROM "groups" WHERE id = ${groupId}::uuid
        UNION ALL
        SELECT g.id FROM "groups" g
        INNER JOIN subtree s ON g.parent_group_id = s.id
      )
      SELECT
        sh.user_id::text AS user_id,
        sh.total_score,
        (sh.created_at::date)::text AS day
      FROM score_history sh
      INNER JOIN group_members gm
        ON gm.user_id = sh.user_id AND gm.group_id IN (SELECT id FROM subtree)
      ORDER BY sh.created_at ASC
    `;

    const chart = buildGroupAverageByDay(historyRows as ScoreDayRow[]);

    type RowOut = {
      userId: string;
      name: string;
      rank: RankId;
      rankGrade: string;
      bestTotalScore: number;
      ageGroup: string;
      gender: string;
      bestScoreDate: string | null;
      weakEvents: string[];
      pass: boolean;
    };

    const rows: RowOut[] = members.map((m) => {
      const best = bestByUser.get(m.user_id);
      const paid = paidByUserId.get(m.user_id) ?? false;
      const rawRank = parseRankId(m.current_rank);
      const rank = effectiveRank(rawRank, paid);
      const displayName =
        m.user_name?.trim() || m.user_email?.split("@")[0] || "Athlete";
      const evScores = {} as Record<EventKey, number>;
      if (best?.event_scores) {
        for (const k of EVENT_ORDER) {
          const v = best.event_scores[k];
          if (typeof v === "number") evScores[k] = v;
        }
      }
      const bestTotal = best?.total_score ?? 0;
      const bestScoreDate = best
        ? best.created_at instanceof Date
          ? best.created_at.toISOString().slice(0, 10)
          : String(best.created_at).slice(0, 10)
        : null;
      return {
        userId: m.user_id,
        name: displayName,
        rank,
        rankGrade: rankDisplayGrade(rank),
        bestTotalScore: bestTotal,
        ageGroup: best?.age_group ?? "—",
        gender: best?.gender ?? "—",
        bestScoreDate,
        weakEvents: best
          ? weakEventLabelsBelow(best.event_scores, 75)
          : [],
        pass: isHistoryOverallPass(evScores),
      };
    });

    rows.sort((a, b) => b.bestTotalScore - a.bestTotalScore);
    const top = rows.slice(0, 20);

    const sumBest = rows.reduce((s, r) => s + r.bestTotalScore, 0);
    const averageScore =
      rows.length > 0 ? Math.round((sumBest / rows.length) * 10) / 10 : 0;

    return NextResponse.json({
      leaderboard: top,
      averageScore,
      chart,
    });
  } catch {
    return NextResponse.json({
      leaderboard: [],
      averageScore: 0,
      chart: [] as { date: string; avg: number }[],
    });
  }
}
