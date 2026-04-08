import { neon } from "@neondatabase/serverless";

/** Average of each member's best total score across the group subtree (same basis as unit leaderboard). */
export async function getGroupTreeAverageScore(
  dbUrl: string,
  groupId: string
): Promise<number> {
  const sql = neon(dbUrl);
  try {
    const raw = await sql`
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
          ROW_NUMBER() OVER (
            PARTITION BY sh.user_id
            ORDER BY sh.total_score DESC, sh.created_at DESC
          ) AS rn
        FROM score_history sh
        INNER JOIN group_members gm
          ON gm.user_id = sh.user_id AND gm.group_id IN (SELECT id FROM subtree)
      ),
      best AS (
        SELECT user_id, total_score FROM ranked WHERE rn = 1
      )
      SELECT COALESCE(ROUND(AVG(total_score)::numeric, 1), 0) AS avg
      FROM best
    `;
    const v = Number((raw as { avg: string | number }[])[0]?.avg ?? 0);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}
