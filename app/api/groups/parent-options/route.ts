import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import type { UnitType } from "@/lib/unit-types";

export const dynamic = "force-dynamic";

/**
 * Lists groups the user may attach as parent: companies (for platoon) or platoons (for squad).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const forChild = searchParams.get("for");
  const parentType: UnitType | null =
    forChild === "platoon" ? "company" : forChild === "squad" ? "platoon" : null;

  if (!parentType) {
    return NextResponse.json(
      { error: "Query param 'for' must be platoon or squad" },
      { status: 400 }
    );
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ options: [] as { id: string; name: string }[] });
  }

  const sql = neon(url);
  const uid = session.user.id;

  try {
    const raw = await sql`
      SELECT g.id::text, g.name
      FROM group_members me
      INNER JOIN "groups" g ON g.id = me.group_id
      WHERE me.user_id = ${uid}::uuid
        AND g.unit_type = ${parentType}
      ORDER BY g.name ASC
    `;
    const options = (raw as { id: string; name: string }[]).map((r) => ({
      id: r.id,
      name: r.name,
    }));
    return NextResponse.json({ options });
  } catch {
    return NextResponse.json({ options: [] });
  }
}
