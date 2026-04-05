import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { awardPatch } from "@/lib/award-patches";
import {
  formatAftPassingMinimumsForPrompt,
  type Gender,
} from "@/lib/aft-scoring";
import { parseEnlistmentPhases } from "@/lib/parse-enlistment-phases";
import { getUserSubscriptionPaid } from "@/lib/user-subscription";

const MODEL = "claude-haiku-4-5-20251001";

function formatTargetDate(iso: string | null | undefined): string {
  if (!iso || !String(iso).trim()) return "not set";
  return String(iso).slice(0, 10);
}

function buildPrompt(payload: {
  branch: string;
  component: string;
  targetDate: string | null;
  age: number;
  gender: Gender;
  hrpRepsBaseline: number;
  runMinutes: number;
  runSeconds: number;
  limitations: string;
}): string {
  const lim =
    payload.limitations.trim() ||
    "None reported.";
  const time = `${payload.runMinutes}:${String(payload.runSeconds).padStart(2, "0")}`;
  const standards = formatAftPassingMinimumsForPrompt(payload.age, payload.gender);

  return `You are a military fitness coach helping a civilian prepare to enlist in the US Army. The Army Fitness Test (AFT) replaced the older Army Physical Fitness Test; do not mention the APFT, sit-ups, or any retired test format.

The AFT has exactly five events (train all of them over this plan):
1. MDL — 3 Repetition Maximum Deadlift (hex/trap bar): max weight for 3 reps.
2. HRP — Hand-Release Push-Up: max reps in 2 minutes with full hand release from the ground each rep (NOT standard push-ups).
3. SDC — Sprint-Drag-Carry: five 50 m shuttles (sprint, drag, lateral, carry) for total time.
4. PLK — Plank: max hold time (forearm plank per Army standard).
5. 2MR — Two-Mile Run: continuous two-mile time on a measured course.

Athlete profile:
- Age: ${payload.age}, gender: ${payload.gender === "male" ? "male" : "female"}
- Current baseline (self-reported): about ${payload.hrpRepsBaseline} HRP reps in 2 minutes (program toward proper hand-release form; never substitute regular push-up volume as identical to HRP).
- 1-mile run time today: ${time} (use to build toward 2MR; include easy mileage, tempo, and interval work for two miles — not a 1-mile test event).
- Target enlistment date: ${formatTargetDate(payload.targetDate)}
- Component: ${payload.component}; branch: ${payload.branch}
- Injuries/limitations: ${lim}

Official minimum passing raw standards for this athlete (align volume and progression toward these; 60-point floor on the May 2025 tables):
${standards}

Programming requirements:
- Never prescribe sit-ups or crunch-only work for "Army test prep."
- Phase 1 (Build the Base): GPP, aerobic base, movement quality, introduce hex-bar/trap-bar deadlift pattern (hinge), HRP skill, plank endurance, and light SDC-style footwork and carries.
- Phase 2 (Military Ready): Progress MDL (hex bar, Romanian deadlifts, trap-bar work as appropriate), HRP-specific density and strict hand-release mechanics, SDC prep (sprints ~25–50 m, sled drags or heavy pushes or band-resisted substitutes, lateral shuffles, farmer carries, plate drags as available), PLK volume and time-under-tension, and structured 2MR pace work building from 1-mile fitness.
- Phase 3 (Test Simulation): Mimic AFT test conditions and order awareness — full practice sessions with rest as needed, not the old APFT layout. Include combined sessions that prepare transitions between events safely.

Generate a complete 12-week plan in markdown. Structure as 3 phases of 4 weeks each. Each week: list training days with exercises, sets, reps or times, and rest. Make it progressive and realistic. Format in markdown only (no JSON).

Use exactly these three top-level phase headings so the document can be split:
## Phase 1: Build the Base (Weeks 1-4)
## Phase 2: Military Ready (Weeks 5-8)
## Phase 3: Test Simulation (Weeks 9-12)

Under each phase, use ## Week N headings for each week in that phase.`;
}

function normComponent(s: string): string | null {
  const t = s.trim();
  if (
    t === "Active Duty" ||
    t === "Army Reserve" ||
    t === "National Guard"
  ) {
    return t;
  }
  return null;
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
    branch?: string;
    component?: string;
    targetDate?: string | null;
    age?: number;
    gender?: string;
    currentPushups?: number;
    currentRunMinutes?: number;
    currentRunSeconds?: number;
    limitations?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const branch =
    typeof body.branch === "string" && body.branch.trim()
      ? body.branch.trim()
      : "Army";
  const component = normComponent(String(body.component ?? ""));
  if (!component) {
    return NextResponse.json({ error: "Invalid component" }, { status: 400 });
  }

  const age = Number(body.age);
  if (!Number.isFinite(age) || age < 17 || age > 100) {
    return NextResponse.json({ error: "Invalid age" }, { status: 400 });
  }

  const gRaw = String(body.gender ?? "").toLowerCase();
  const gender = gRaw === "female" ? "female" : "male";

  const pushups = Number(body.currentPushups);
  const runMinutes = Number(body.currentRunMinutes);
  const runSeconds = Number(body.currentRunSeconds);
  if (!Number.isFinite(pushups) || pushups < 0) {
    return NextResponse.json({ error: "Invalid pushups" }, { status: 400 });
  }
  if (!Number.isFinite(runMinutes) || runMinutes < 0) {
    return NextResponse.json({ error: "Invalid run" }, { status: 400 });
  }
  if (!Number.isFinite(runSeconds) || runSeconds < 0 || runSeconds > 59) {
    return NextResponse.json({ error: "Invalid run seconds" }, { status: 400 });
  }

  let targetDate: string | null = null;
  if (body.targetDate != null && String(body.targetDate).trim() !== "") {
    const d = String(body.targetDate).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) targetDate = d;
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
    branch,
    component,
    targetDate,
    age: Math.floor(age),
    gender,
    hrpRepsBaseline: Math.floor(pushups),
    runMinutes: Math.floor(runMinutes),
    runSeconds: Math.floor(runSeconds),
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
        : "Unable to generate plan.";
  } catch (e) {
    const message = e instanceof Error ? e.message : "Anthropic request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { phase1, phase2, phase3 } = parseEnlistmentPhases(markdown);

  const url = process.env.DATABASE_URL;
  if (url?.trim()) {
    try {
      const sql = neon(url);
      await sql`
        INSERT INTO enlistment_profiles (
          user_id,
          branch,
          component,
          target_date,
          age,
          gender,
          current_pushups,
          current_run_minutes,
          current_run_seconds,
          limitations,
          plan_markdown,
          updated_at
        )
        VALUES (
          ${session.user.id}::uuid,
          ${branch},
          ${component},
          ${targetDate}::date,
          ${Math.floor(age)},
          ${gender},
          ${Math.floor(pushups)},
          ${Math.floor(runMinutes)},
          ${Math.floor(runSeconds)},
          ${limitations},
          ${markdown},
          NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          branch = EXCLUDED.branch,
          component = EXCLUDED.component,
          target_date = EXCLUDED.target_date,
          age = EXCLUDED.age,
          gender = EXCLUDED.gender,
          current_pushups = EXCLUDED.current_pushups,
          current_run_minutes = EXCLUDED.current_run_minutes,
          current_run_seconds = EXCLUDED.current_run_seconds,
          limitations = EXCLUDED.limitations,
          plan_markdown = EXCLUDED.plan_markdown,
          updated_at = NOW()
      `;
    } catch {
      /* silent */
    }
  }

  try {
    await awardPatch(session.user.id, "civilian_ready");
  } catch {
    /* silent */
  }

  return NextResponse.json({ markdown, phase1, phase2, phase3 });
}
