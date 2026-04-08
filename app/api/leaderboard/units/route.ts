import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { isUnitType, type UnitType } from "@/lib/unit-types";
import { getGroupTreeAverageScore } from "@/lib/group-average-score";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const unitType: UnitType | null =
    level && isUnitType(level) ? level : null;

  if (!unitType) {
    return NextResponse.json(
      { error: "Query 'level' must be squad, platoon, or company" },
      { status: 400 }
    );
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return NextResponse.json({ rows: [] as { id: string; name: string; averageScore: number }[] });
  }

  const sql = neon(url);

  try {
    const raw = await sql`
      SELECT id::text, name
      FROM "groups"
      WHERE unit_type = ${unitType}
      ORDER BY created_at DESC
      LIMIT 40
    `;
    const groups = raw as { id: string; name: string }[];

    const scores = await Promise.all(
      groups.map(async (g) => ({
        id: g.id,
        name: g.name,
        averageScore: await getGroupTreeAverageScore(url, g.id),
      }))
    );

    scores.sort((a, b) => b.averageScore - a.averageScore);

    return NextResponse.json({ rows: scores });
  } catch {
    return NextResponse.json({ rows: [] });
  }
}
