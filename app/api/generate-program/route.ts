import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type {
  GeneralProgramEquipment,
  GeneralProgramFitnessLevel,
  GeneralProgramGoal,
} from "@/lib/general-program-types";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

const MODEL = "claude-haiku-4-5-20251001";

function buildPrompt(payload: {
  goal: GeneralProgramGoal;
  trainingDays: number;
  equipment: GeneralProgramEquipment;
  fitnessLevel: GeneralProgramFitnessLevel;
  limitations: string;
}): string {
  const lim =
    payload.limitations.trim() ||
    "None reported — assume no special restrictions unless standard military training precautions.";
  return `You are a military fitness coach. Generate a complete 8-week training program.

Soldier / athlete profile:
- Goal: ${payload.goal}
- Training days per week: ${payload.trainingDays}
- Equipment available: ${payload.equipment}
- Fitness level: ${payload.fitnessLevel}
- Injuries or limitations: ${lim}

Structure the program in four phases:
- Week 1–2: Foundation
- Week 3–4: Build
- Week 5–6: Intensity
- Week 7–8: Peak

For each calendar week, include:
- A weekly focus (one short paragraph)
- Notes for recovery, progression, and safety
- Each training day in that week: list exercises with sets, reps (or time/distance where appropriate), and rest periods between sets or efforts

Use only the equipment available (${payload.equipment}). Match volume and complexity to ${payload.fitnessLevel} level. Align emphasis with the goal: ${payload.goal}.

Return **markdown formatted text** only. Use clear headings (##) for each week and ### for each training day. Do not include JSON or code fences.`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let paid = false;
  try {
    paid = await getUserSubscriptionPaid(session.user.id);
  } catch {
    paid = false;
  }
  if (!paid) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  let body: {
    goal?: string;
    trainingDays?: number;
    equipment?: string;
    fitnessLevel?: string;
    limitations?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const goals: GeneralProgramGoal[] = [
    "Strength",
    "Cardio",
    "Full Military Fitness",
  ];
  const equipments: GeneralProgramEquipment[] = [
    "No equipment",
    "Dumbbells only",
    "Full gym",
  ];
  const levels: GeneralProgramFitnessLevel[] = [
    "Beginner",
    "Intermediate",
    "Advanced",
  ];

  const goal = body.goal as GeneralProgramGoal;
  const equipment = body.equipment as GeneralProgramEquipment;
  const fitnessLevel = body.fitnessLevel as GeneralProgramFitnessLevel;
  const td = body.trainingDays;

  if (!goal || !goals.includes(goal)) {
    return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
  }
  if (td !== 3 && td !== 4 && td !== 5 && td !== 6) {
    return NextResponse.json({ error: "Invalid training days" }, { status: 400 });
  }
  if (!equipment || !equipments.includes(equipment)) {
    return NextResponse.json({ error: "Invalid equipment" }, { status: 400 });
  }
  if (!fitnessLevel || !levels.includes(fitnessLevel)) {
    return NextResponse.json({ error: "Invalid fitness level" }, { status: 400 });
  }

  const limitations =
    typeof body.limitations === "string" ? body.limitations : "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server missing ANTHROPIC_API_KEY" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildPrompt({
    goal,
    trainingDays: td,
    equipment,
    fitnessLevel,
    limitations,
  });

  let markdown: string;
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((b) => b.type === "text");
    markdown =
      block && block.type === "text"
        ? block.text.trim()
        : "Unable to generate program.";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Anthropic request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ markdown });
}
