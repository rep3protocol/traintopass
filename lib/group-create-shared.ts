import { generateJoinCode } from "@/lib/groups";
import { checkAndAwardPatches } from "@/lib/award-patches";
import type { UnitType } from "@/lib/unit-types";
import { parentUnitTypeFor } from "@/lib/unit-types";

type Sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown>;

export type CreateGroupParams = {
  name: string;
  leaderId: string;
  unitType: UnitType;
  parentGroupId: string | null;
  creationCheckoutSessionId?: string | null;
};

export async function validateParentForLeader(
  sql: Sql,
  leaderId: string,
  parentGroupId: string,
  childType: UnitType
): Promise<{ ok: true } | { ok: false; message: string }> {
  const expectedParent = parentUnitTypeFor(childType);
  if (!expectedParent) {
    return { ok: false, message: "Invalid unit hierarchy" };
  }
  const rows = await sql`
    SELECT unit_type::text AS unit_type
    FROM "groups"
    WHERE id = ${parentGroupId}::uuid
    LIMIT 1
  `;
  const parentType = (rows as { unit_type: string }[])[0]?.unit_type;
  if (parentType !== expectedParent) {
    return { ok: false, message: "Parent unit type does not match" };
  }
  const mem = await sql`
    SELECT 1 FROM group_members
    WHERE group_id = ${parentGroupId}::uuid AND user_id = ${leaderId}::uuid
    LIMIT 1
  `;
  if ((mem as unknown[]).length === 0) {
    return { ok: false, message: "You must be a member of the parent unit" };
  }
  return { ok: true };
}

/**
 * Inserts a group and adds the leader as a member. Retries on join_code collision.
 */
export async function insertGroupWithLeader(
  sql: Sql,
  params: CreateGroupParams
): Promise<
  | { ok: true; id: string; name: string; join_code: string }
  | { ok: false; error: string }
> {
  const { name, leaderId, unitType, parentGroupId, creationCheckoutSessionId } =
    params;

  if (parentGroupId) {
    const v = await validateParentForLeader(sql, leaderId, parentGroupId, unitType);
    if (!v.ok) return { ok: false, error: v.message };
  } else if (unitType === "squad" || unitType === "platoon") {
    /* optional parent — ok */
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const joinCode = generateJoinCode();
    let groupId: string | null = null;
    try {
      const inserted = await sql`
        INSERT INTO "groups" (
          name,
          join_code,
          leader_id,
          unit_type,
          parent_group_id,
          creation_checkout_session_id
        )
        VALUES (
          ${name},
          ${joinCode},
          ${leaderId}::uuid,
          ${unitType},
          ${parentGroupId},
          ${creationCheckoutSessionId ?? null}
        )
        RETURNING id::text, name, join_code
      `;
      const row = (inserted as { id: string; name: string; join_code: string }[])[0];
      if (!row?.id) continue;
      groupId = row.id;
      await sql`
        INSERT INTO group_members (group_id, user_id)
        VALUES (${groupId}::uuid, ${leaderId}::uuid)
      `;
      try {
        await checkAndAwardPatches(leaderId, { isGroupLeader: true });
      } catch {
        /* silent */
      }
      return { ok: true, id: row.id, name: row.name, join_code: row.join_code };
    } catch (e: unknown) {
      if (groupId) {
        try {
          await sql`DELETE FROM "groups" WHERE id = ${groupId}::uuid`;
        } catch {
          /* silent */
        }
      }
      const code = (e as { code?: string })?.code;
      if (code === "23505") continue;
      return { ok: false, error: "Unable to create unit" };
    }
  }

  return { ok: false, error: "Unable to create unit" };
}
