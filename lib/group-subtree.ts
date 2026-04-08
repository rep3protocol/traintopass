import { neon } from "@neondatabase/serverless";
import type { UnitType } from "@/lib/unit-types";

export async function fetchSubtreeGroupIds(
  dbUrl: string,
  rootGroupId: string
): Promise<string[]> {
  const sql = neon(dbUrl);
  const raw = await sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "groups" WHERE id = ${rootGroupId}::uuid
      UNION ALL
      SELECT g.id FROM "groups" g
      INNER JOIN subtree s ON g.parent_group_id = s.id
    )
    SELECT id::text FROM subtree
  `;
  return (raw as { id: string }[]).map((r) => r.id);
}

export async function countDescendantsByUnitType(
  dbUrl: string,
  rootGroupId: string
): Promise<{ platoon: number; squad: number }> {
  const sql = neon(dbUrl);
  const raw = await sql`
    WITH RECURSIVE tree AS (
      SELECT id, unit_type, parent_group_id
      FROM "groups"
      WHERE parent_group_id = ${rootGroupId}::uuid
      UNION ALL
      SELECT g.id, g.unit_type, g.parent_group_id
      FROM "groups" g
      INNER JOIN tree t ON g.parent_group_id = t.id
    )
    SELECT
      COALESCE(SUM(CASE WHEN unit_type = 'platoon' THEN 1 ELSE 0 END), 0)::int AS platoon,
      COALESCE(SUM(CASE WHEN unit_type = 'squad' THEN 1 ELSE 0 END), 0)::int AS squad
    FROM tree
  `;
  const row = (raw as { platoon: number; squad: number }[])[0];
  return {
    platoon: Number(row?.platoon ?? 0),
    squad: Number(row?.squad ?? 0),
  };
}

/** Direct children only (for detail panels). */
export async function fetchChildGroups(
  dbUrl: string,
  parentId: string
): Promise<{ id: string; name: string; unit_type: UnitType }[]> {
  const sql = neon(dbUrl);
  const raw = await sql`
    SELECT id::text, name, unit_type
    FROM "groups"
    WHERE parent_group_id = ${parentId}::uuid
    ORDER BY name ASC
  `;
  return (raw as { id: string; name: string; unit_type: string }[]).map((r) => ({
    id: r.id,
    name: r.name,
    unit_type: r.unit_type as UnitType,
  }));
}
