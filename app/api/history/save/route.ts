import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";
import type { AnalyzeResponseBody } from "@/lib/analyze-types";
import type {
  GeneralProgramEquipment,
  GeneralProgramFitnessLevel,
  GeneralProgramGoal,
} from "@/lib/general-program-types";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

type GeneralProgramSaveBody = {
  type: "general_program";
  goal: GeneralProgramGoal;
  trainingDays: 3 | 4 | 5 | 6;
  equipment: GeneralProgramEquipment;
  fitnessLevel: GeneralProgramFitnessLevel;
  limitations?: string;
  programMarkdown: string;
};

function isGeneralProgramBody(x: unknown): x is GeneralProgramSaveBody {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.type !== "general_program") return false;
  const td = o.trainingDays;
  if (td !== 3 && td !== 4 && td !== 5 && td !== 6) return false;
  return (
    typeof o.goal === "string" &&
    typeof o.equipment === "string" &&
    typeof o.fitnessLevel === "string" &&
    typeof o.programMarkdown === "string" &&
    o.programMarkdown.trim() !== ""
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (isGeneralProgramBody(raw)) {
    let paid = false;
    try {
      paid = await getUserSubscriptionPaid(session.user.id);
    } catch {
      paid = false;
    }
    if (!paid) {
      return NextResponse.json({ error: "Subscription required" }, { status: 403 });
    }

    const lim =
      typeof raw.limitations === "string" ? raw.limitations.trim() : "";
    const sql = neon(url);
    try {
      await sql`
        INSERT INTO general_program_history (
          user_id,
          goal,
          training_days,
          equipment,
          fitness_level,
          limitations,
          program_markdown
        )
        VALUES (
          ${session.user.id}::uuid,
          ${raw.goal},
          ${raw.trainingDays},
          ${raw.equipment},
          ${raw.fitnessLevel},
          ${lim || null},
          ${raw.programMarkdown}
        )
      `;
    } catch {
      return NextResponse.json({ error: "Could not save" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const body = raw as { result?: AnalyzeResponseBody };
  const data = body.result;
  if (!data || typeof data.totalScore !== "number" || !data.events) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }

  const eventScores: Record<string, number> = {};
  for (const ev of data.events) {
    eventScores[ev.key] = ev.score;
  }

  const ageGroup = data.ageGroup ?? "—";
  const gender = data.gender === "female" ? "Female" : "Male";
  const eventScoresJson = JSON.stringify(eventScores);

  const sql = neon(url);
  try {
    await sql`
      INSERT INTO score_history (user_id, age_group, gender, total_score, event_scores)
      VALUES (
        ${session.user.id}::uuid,
        ${ageGroup},
        ${gender},
        ${Math.round(data.totalScore)},
        CAST(${eventScoresJson} AS jsonb)
      )
    `;
  } catch {
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
