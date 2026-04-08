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
import type {
  AnalyzeRequestBody,
  AnalyzeResponseBody,
  MosStandard,
  TrainingDaysPerWeek,
} from "@/lib/analyze-types";
import { extractPlanTextAndDeepDives } from "@/lib/extract-event-deep-dives";
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

function isMosStandard(s: string): s is MosStandard {
  return s === "general" || s === "combat";
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
  trainingDays: TrainingDaysPerWeek;
  eventNamesForJson: string[];
  mosStandard: MosStandard;
}): string {
  const genderLabel = payload.gender === "male" ? "Male" : "Female";
  const namesList = payload.eventNamesForJson.map((n) => `- ${n}`).join("\n");
  const combatLine =
    payload.mosStandard === "combat"
      ? "\nThis soldier is in a combat MOS and must meet the 350-point sex-neutral total-score standard.\n"
      : "";
  return `You are a U.S. Army AFT (Army Fitness Test)-focused strength and conditioning coach.

The AFT has five events: 3 Repetition Maximum Deadlift (MDL), Hand-Release Push-Up (HRP), Sprint-Drag-Carry (SDC), Plank (PLK), and Two-Mile Run (2MR).

Soldier profile:
- Gender: ${genderLabel}
- Age group: ${payload.ageGroup}
- AFT event scores (0–100 scale per event, 60 minimum pass per event, 100 max per event, 500 total possible across all five events):
${combatLine}

${payload.lines.join("\n")}

Events scoring below 75 (priority for improvement): ${
    payload.weakEvents.length
      ? payload.weakEvents.join(", ")
      : "None — still provide a balanced maintenance plan."
  }

The soldier can train ${payload.trainingDays} days per week. Structure the 4-week plan around this availability. Distribute work across the available training days so no single day is overloaded.

Tailor the plan appropriately for this soldier's gender and age group. Write a practical 4-week training plan. Emphasize the weakest events above while keeping the other events maintained. Include volume, intensity notes, and rest guidance.

Use these training rules when generating the plan:
- Progressive overload across the 4-week cycle:
  - Week 1: 70-75% intensity baseline
  - Week 2: 80-85% intensity build
  - Week 3: 85-90% intensity peak
  - Week 4: deload at ~70% intensity before repeating or advancing
- Manage CNS fatigue: never schedule heavy compound lifts (including deadlift and heavy carries) on back-to-back days. High CNS demand work must have 48-72 hours before repeating.
- Session focus: each training day should prioritize 1-2 weak AFT events. Accessory work for other events is allowed, but keep it low intensity when primary work is heavy.
- Volume control: limit high-intensity work to 3-5 working sets per primary movement. Reserve max-out sets for testing days only, not normal training sessions.
- Recovery integration: explicitly include 1-2 rest or active recovery days per week. Active recovery can include light rucking, mobility, or Zone 2 cardio, not additional heavy training.
- Plans should be hard but smart: optimize for peak AFT test-day performance, not training exhaustion. Manage fatigue so the soldier can be fresh and strong when it counts.

Use plain text with EXACT section headings so parsing works:

## Week 1
(week 1 content)

## Week 2
(week 2 content)

## Week 3
(week 3 content)

## Week 4
(week 4 content)

No preamble before ## Week 1.

After the Week 4 section, output nothing else except one markdown fenced JSON code block using the json language tag. The block must be valid JSON with this shape:
{"eventDeepDives":[...]}

For each event where the soldier scored below 75 points, include exactly one object in eventDeepDives with:
- "event": string — use the EXACT event name from this list (copy verbatim):
${namesList}
- "drills": array of exactly 5 strings — each string names one drill and includes specific sets, reps, and rest periods (e.g. "Romanian deadlift: 4×6 @ RPE 7, 2 min rest between sets")
- "mistake": string — one common mistake to avoid for this event
- "tip": string — one tip to maximize score on test day

If no events are below 75, use an empty array: "eventDeepDives": []

Do not add commentary outside the JSON code block after Week 4.`;
}

/** AFT analysis (no user context). Achievement patches are awarded when results are saved via POST /api/history/save. */
export async function POST(req: Request) {
  let body: AnalyzeRequestBody;
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ageGroup, gender, scores } = body;
  const rawMosStandard = body.mosStandard;
  const mosStandard: MosStandard =
    rawMosStandard && isMosStandard(rawMosStandard) ? rawMosStandard : "general";

  let trainingDays: TrainingDaysPerWeek = 4;
  const td = body.trainingDays;
  if (td === 3 || td === 4 || td === 5 || td === 6) {
    trainingDays = td;
  }
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
  const totalPassingThreshold = mosStandard === "combat" ? 350 : 300;
  const overallPassed =
    events.every((e) => e.passed) && totalScore >= totalPassingThreshold;

  const lines = events.map(
    (e) =>
      `- ${e.label}: ${e.score} pts (${e.passed ? "pass" : "fail"}, raw: ${rawForPrompt(e.key, e.raw)})`
  );

  const weakEvents = events
    .filter((e) => e.score < 75)
    .map((e) => `${e.label} (${e.score})`);

  const eventNamesForJson = events.map((e) => e.label);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server missing ANTHROPIC_API_KEY" },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildPrompt({
    ageGroup,
    gender,
    lines,
    weakEvents,
    trainingDays,
    eventNamesForJson,
    mosStandard,
  });

  let rawModelText: string;
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((b) => b.type === "text");
    rawModelText =
      block && block.type === "text"
        ? block.text
        : "Unable to generate plan.";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Anthropic request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { planText, eventDeepDives } = extractPlanTextAndDeepDives(rawModelText);
  const aiPlanFull = planText;
  const weeks = parsePlanWeeks(aiPlanFull);

  const payload: AnalyzeResponseBody = {
    ageGroup,
    gender,
    mosStandard,
    events,
    totalScore,
    overallPassed,
    aiPlanFull,
    weeks,
    eventDeepDives,
  };

  return NextResponse.json(payload);
}
