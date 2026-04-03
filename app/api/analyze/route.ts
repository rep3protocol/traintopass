import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  AGE_GROUPS,
  EVENT_LABELS,
  EVENT_ORDER,
  eventStatus,
  formatSecondsAsMmSs,
  type AgeGroup,
  type EventKey,
  type Gender,
  scoreEvent,
} from "@/lib/aft-scoring";
import type { AnalyzeRequestBody, AnalyzeResponseBody } from "@/lib/analyze-types";
import { parsePlanWeeks } from "@/lib/parse-plan-weeks";

const MODEL = "claude-haiku-4-5-20251001";

function isAgeGroup(s: string): s is AgeGroup {
  return (AGE_GROUPS as string[]).includes(s);
}

function isGender(s: string): s is Gender {
  return s === "male" || s === "female";
}

function isTimedEvent(key: EventKey): boolean {
  return key === "sdc" || key === "plk" || key === "twoMR";
}

function rawForPrompt(key: EventKey, raw: number): string {
  if (isTimedEvent(key)) {
    return `${formatSecondsAsMmSs(raw)} (${raw}s)`;
  }
  return String(raw);
}

function buildPrompt(payload: {
  ageGroup: AgeGroup;
  gender: Gender;
  lines: string[];
  weakEvents: string[];
}): string {
  const genderLabel = payload.gender === "male" ? "Male" : "Female";
  return `You are a U.S. Army AFT (Army Fitness Test)-focused strength and conditioning coach.

The AFT has five events: 3 Repetition Maximum Deadlift (MDL), Hand-Release Push-Up (HRP), Sprint-Drag-Carry (SDC), Plank (PLK), and Two-Mile Run (2MR).

Soldier profile:
- Gender: ${genderLabel}
- Age group: ${payload.ageGroup}
- AFT event scores (0–100 scale per event, 60 minimum pass per event, 100 max per event, 500 total possible across all five events):

${payload.lines.join("\n")}

Events scoring below 75 (priority for improvement): ${
    payload.weakEvents.length
      ? payload.weakEvents.join(", ")
      : "None — still provide a balanced maintenance plan."
  }

Tailor the plan appropriately for this soldier's gender and age group. Write a practical 4-week training plan (Mon–Sun structure optional but helpful). Emphasize the weakest events above while keeping the other events maintained. Include volume, intensity notes, and rest guidance. Use plain text with EXACT section headings so parsing works:

## Week 1
(week 1 content)

## Week 2
(week 2 content)

## Week 3
(week 3 content)

## Week 4
(week 4 content)

No preamble before ## Week 1.`;
}

export async function POST(req: Request) {
  let body: AnalyzeRequestBody;
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ageGroup, gender, scores } = body;
  if (!ageGroup || !isAgeGroup(ageGroup)) {
    return NextResponse.json({ error: "Invalid age group" }, { status: 400 });
  }
  if (!gender || !isGender(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }
  if (!scores || typeof scores !== "object") {
    return NextResponse.json({ error: "Missing scores" }, { status: 400 });
  }

  for (const key of EVENT_ORDER) {
    const v = scores[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return NextResponse.json(
        { error: `Invalid or missing score for ${key}` },
        { status: 400 }
      );
    }
  }

  const events = EVENT_ORDER.map((key: EventKey) => {
    const raw = scores[key];
    const score = scoreEvent(key, ageGroup, gender, raw);
    const passed = score >= 60;
    const status = eventStatus(score);
    return {
      key,
      label: EVENT_LABELS[key],
      raw,
      score,
      passed,
      status,
    };
  });

  const totalScore =
    Math.round(events.reduce((s, e) => s + e.score, 0) * 10) / 10;
  const overallPassed = events.every((e) => e.passed);

  const lines = events.map(
    (e) =>
      `- ${e.label}: ${e.score} pts (${e.passed ? "pass" : "fail"}, raw: ${rawForPrompt(e.key, e.raw)})`
  );

  const weakEvents = events
    .filter((e) => e.score < 75)
    .map((e) => `${e.label} (${e.score})`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server missing ANTHROPIC_API_KEY" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildPrompt({ ageGroup, gender, lines, weakEvents });

  let aiPlanFull: string;
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((b) => b.type === "text");
    aiPlanFull =
      block && block.type === "text"
        ? block.text
        : "Unable to generate plan.";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Anthropic request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const weeks = parsePlanWeeks(aiPlanFull);

  const payload: AnalyzeResponseBody = {
    ageGroup,
    gender,
    events,
    totalScore,
    overallPassed,
    aiPlanFull,
    weeks,
  };

  return NextResponse.json(payload);
}
