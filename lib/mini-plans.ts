export type MiniPlan = {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  markdown: string;
};

export const MINI_PLANS: MiniPlan[] = [
  {
    id: "improve-run",
    title: "Improve Your Run",
    subtitle: "2-mile run performance for the AFT 2MR event",
    duration: "2 weeks · 3 days/week",
    markdown: `
## Week 1 — Base & speed introduction

**Focus:** Aerobic base, leg durability, and short bursts of faster running. Keep easy days truly easy so hard days stay quality.

### Day 1 — Easy aerobic

- **Main set:** 25–35 minutes continuous easy jog. You should be able to speak in full sentences (conversational pace). If you use a watch, aim for roughly **60–75% max heart rate** or a pace **2:00–3:00 per mile slower** than your current 2-mile test pace.
- **Optional finish:** 4 × 20-second strides on flat ground, **walk 60 seconds** between each. Strides are smooth and quick—not an all-out sprint.
- **Coaching:** One rest day before your next hard session. Hydrate; sleep matters more than extra miles this week.

### Day 2 — Intervals (short)

- **Warm-up:** 10–15 min easy jog + dynamic drills (leg swings, walking lunges, A-skips).
- **Main set:** 6 × **400 m** at **5K effort** (roughly **10–15 sec per 400 m faster** than your average 2-mile pace), **90 seconds easy jog or walk** recovery between reps.
- **Cool-down:** 10 min very easy jog.
- **Coaching:** If you cannot hold form on rep 5–6, shorten to **5 × 400 m** next time or add 15 seconds recovery. Quality over volume.

### Day 3 — Long easy

- **Main set:** 30–40 minutes **steady easy** on the same route when possible. Same conversational effort as Day 1; add **5 minutes** vs Day 1 if legs feel good.
- **Coaching:** No strides today. If ankles or shins complain, swap last 10 minutes for brisk walk.

---

## Week 2 — Tempo & race rhythm

**Focus:** Sustain “comfortably hard” pace and practice locking into 2-mile rhythm without burning out early.

### Day 1 — Tempo run

- **Warm-up:** 12 min easy.
- **Main set:** **2 × 10 minutes** at **threshold effort** (hard but controlled; **~1 hour race pace** or “could say a short sentence, not a paragraph”). **3 min easy jog** between the two blocks.
- **Cool-down:** 8–10 min easy.
- **Coaching:** If you fade badly in block 2, next session use **2 × 8 min** at the same effort. The goal is even splits, not a PR every rep.

### Day 2 — Cruise intervals

- **Warm-up:** 10 min easy.
- **Main set:** 5 × **800 m** at **slightly slower than 2-mile race pace** (about **3–5 sec per 400 m** slower than all-out 2-mile splits), **2 min easy jog** recovery.
- **Cool-down:** 10 min easy.
- **Coaching:** Count your splits; the last rep should feel like work but not a collapse. **Full rest day** tomorrow.

### Day 3 — Easy + 2-mile practice (optional test)

- **Option A (recovery):** 25 min easy jog only.
- **Option B (if you feel fresh):** 15 min easy, then **1 mile at goal 2-mile pace**, 5 min easy jog, then **4 × 200 m** at **mile pace** with **90 sec** walk/jog between. 10 min cool-down.
- **Coaching:** Do Option B **at most** once in this micro-cycle. Follow with **2 easy days** before any official test.

> **Weekly recovery:** At least **2 full non-running days** per week (can include walking or mobility). If you add a fourth day, keep it **20 min easy** only.
`.trim(),
  },
  {
    id: "pushup-booster",
    title: "Push-Up Booster",
    subtitle: "Hand-release push-up volume for the AFT HRP event",
    duration: "2 weeks · 4 days/week",
    markdown: `
## Week 1 — Volume & patterning

**Focus:** Grease the groove on hand-release mechanics, shoulders over wrists, rigid plank, consistent depth.

### Day 1 — Pyramid volume

- **Warm-up:** 2 × 10 **scap push-ups** (hands under shoulders, elbows locked, only shoulder blades move), **30 sec** rest between.
- **Main set — pyramid:** **1-2-3-4-5-4-3-2-1** hand-release push-ups (or regular push-ups if HRP is new). **45–60 sec** rest between rungs; **90 sec** after the top (5).
- **Finisher:** 2 × **max strict push-ups** (no release) with **2 min** rest—stop **1–2 reps shy** of failure to protect form.
- **Coaching:** Chest to ground, full release of hands, pause, press. If the pyramid fails mid-way, **resume at the last completed rung** next set.

### Day 2 — Tempo & holds

- **Warm-up:** Arm circles and **30 sec** dead hang from a sturdy bar or **table edge bodyweight row** hold if no bar—**2 rounds**.
- **Main set:** **5 × 8** push-ups with **3 sec lower, 1 sec pause chest 1 inch off floor, explode up**—**90 sec** rest between sets.
- **Accessory:** **3 × 30 sec** front plank (glutes squeezed, ribs down), **45 sec** rest.
- **Coaching:** If 8 reps breaks form, drop to **6 reps** and keep the tempo.

### Day 3 — Active recovery / easy sets

- **Main set:** **6 × 5** perfect HRP or push-ups, **60 sec** rest—focus on **elbows ~45°** from torso, not flared.
- **Finisher:** **100 total** knee or incline push-ups in as few sets as possible, **max 20 reps** per set, **45 sec** between sets.
- **Coaching:** This is a **technique day**—stop any set that loses the straight line from head to heels.

### Day 4 — Negatives & density

- **Warm-up:** **2 × 12** wall push-ups, slow and controlled.
- **Main set:** **4 × 5** **slow negatives** (5 sec down, release, reset from knees or top) for HRP or standard push-up—**2 min** rest.
- **Density block:** **EMOM 10 min:** minute 1 **6 push-ups**, minute 2 **6 push-ups**… if you miss a round, next minute do **4** instead.
- **Coaching:** Stop if wrists or shoulders ache sharply—substitute incline push-ups.

---

## Week 2 — Intensity & specificity

**Focus:** Higher neural drive, shorter rest on submax sets, and test-readiness without daily failure.

### Day 1 — Ladder + max

- **Warm-up:** Same scap push-ups as Week 1 Day 1.
- **Main set — ladder:** **2-4-6-8-6-4-2** HRP or push-ups, **60 sec** rest between rungs.
- **Max test:** **1 × max HRP** in **2 minutes** (stop if form breaks)—record number.
- **Coaching:** **48+ hours** before next hard upper day.

### Day 2 — Cluster sets

- **Main set:** **5 rounds** of **(4 + 4 + 4)** push-ups—**10 sec** between mini-sets inside a round, **2 min** between rounds. Use **HRP** if possible; otherwise strict push-ups.
- **Accessory:** **3 × 12** band or **chair dips** (shoulders down, elbows back), **90 sec** rest—skip if shoulders feel beat up.
- **Coaching:** If the third “4” fails, finish the round with **knee push-ups** and note it for next week.

### Day 3 — Explosive & core

- **Main set:** **6 × 6** **hands-release** with **explosive** press (still controlled landing)—**75 sec** rest.
- **Core:** **3 × 12** dead bug (slow), **45 sec** rest between.
- **Coaching:** Quality reps only—no bouncing off the floor.

### Day 4 — Peaking practice

- **Warm-up:** Easy **2 × 8** push-ups.
- **Main set:** **3 × submax** sets at **~80%** of your Week 2 Day 1 max (e.g. if max was 30, do **3 × 10–12**) with **2 min** rest—**stop each set with 2 reps in reserve**.
- **Optional:** **1 × 20 sec** max **perfect** HRP in the last minute of the session (stop at first form break).
- **Coaching:** **No training to failure** in the 48 hours before an official HRP test.

> **Rest rule:** Minimum **1 full rest day** between Days 1 & 2 and between 2 & 4 if you feel sore. Sleep **7+ hours** for strength adaptation.
`.trim(),
  },
  {
    id: "general-conditioning",
    title: "General Conditioning",
    subtitle: "Full-body military fitness without equipment",
    duration: "2 weeks · 4 days/week",
    markdown: `
## Week 1 — Movement patterns & capacity

**Focus:** Push, pull (bodyweight), legs, and short cardio. No gym required—use a sturdy table or low bar for rows if available; otherwise **doorframe towel rows** carefully or **reverse shrugs** on the edge of a table.

### Day 1 — Push + core

- **Warm-up:** **5 min** brisk walk or easy jog in place + **20 arm circles** each direction.
- **Circuit — 4 rounds, 90 sec rest between rounds:**
  - **12** push-ups (modify on knees as needed)
  - **20** squat jumps or **25** air squats (choose jumps only if knees are healthy)
  - **30 sec** hollow hold (low back pressed to floor)
- **Finisher:** **3 × 30 sec** mountain climbers, **45 sec** rest.
- **Coaching:** Full range on squats—hip crease below knee at bottom if mobility allows.

### Day 2 — Pull + cardio

- **Warm-up:** **2 × 10** scap pull-ups or **scap retractions** lying face-down, arms in “W”.
- **Main set:** **5 × 8–12** **inverted rows** (bar/table) or **towel row** isometric **3 × 20 sec** hold if no setup—**90 sec** rest.
- **Cardio:** **6 × 1 min** hard / **1 min** easy **run in place, high knees, or jump rope** (simulate with lateral hops if no rope).
- **Coaching:** Pull shoulder blades together before bending elbows on rows.

### Day 3 — Legs + power endurance

- **Warm-up:** **2 × 10** walking lunges (bodyweight).
- **Main set:** **4 × 12** reverse lunges (each leg = 6 per side per set), **90 sec** rest.
- **Superset — 3 rounds, 60 sec between rounds:**
  - **15** glute bridge march (pause 1 sec top each rep)
  - **20** calf raises (slow lower)
- **Finisher:** **100** total **sit-ups** or **dead bugs** (split as needed), stop if hip flexors cramp—switch to dead bugs.
- **Coaching:** Knee tracks over toes on lunges; torso tall.

### Day 4 — Full-body blend

- **Warm-up:** **3 min** easy movement mixing high knees and butt kicks.
- **AMRAP 15 min** (count rounds + reps):
  - **8** burpees (step back if needed)
  - **12** push-ups
  - **16** air squats
- **Cool-down:** **5 min** walk + **2 × 30 sec** quad stretch each leg.
- **Coaching:** Steady pace—**breathing through the nose** when possible on squats and push-ups.

---

## Week 2 — Density & repeatability

**Focus:** Slightly more work per session and faster transitions to mimic fatigue under the AFT.

### Day 1 — Upper + trunk

- **Warm-up:** **1 min** plank shoulder taps (slow), **30 sec** child’s pose.
- **Main set:** **5 × 10** push-ups, **75 sec** rest.
- **Superset — 4 rounds, 45 sec between rounds:**
  - **12** **diamond** or close-hand push-ups (or **8** strict if too hard)
  - **20** **bicycle crunches** (slow)
- **Coaching:** If diamond fails, use **standard width** but **pause 1 sec** at bottom.

### Day 2 — Pull + intervals

- **Main set:** **6 × 6–10** inverted rows (add a **2 sec pause** at top on last 2 reps each set), **75 sec** rest.
- **Intervals:** **8 × 30 sec** hard / **30 sec** easy—**running, stairs, or fast march** with aggressive arm swing.
- **Coaching:** **+1 rep** on rows vs Week 1 if form stays solid.

### Day 3 — Legs + core

- **Main set:** **5 × 8** **jump squats** (sub **speed squats** if impact is an issue), **90 sec** rest.
- **Circuit — 3 rounds, 90 sec between rounds:**
  - **30 sec** wall sit
  - **15** single-leg Romanian deadlift (each leg—balance, **slow**)
  - **20** **flutter kicks** (low back flat)
- **Coaching:** Land softly on jump squats; **quiet feet**.

### Day 4 — “Mini AFT” simulation (no scoring pressure)

- **Format:** Move continuously with **form priority**—not a max test.
- **Block 1 — 8 min:** **1 min** easy jog or march / **30 sec** burpees / **30 sec** rest — **repeat** to fill time.
- **Block 2 — 6 min:** **Max strict push-ups in 2 min** cap at **submax** (e.g. stop at **70%** of best effort) then **2 min** walk.
- **Block 3 — 6 min:** **Air squats 20** + **push-ups 10** + **30 sec** plank — **2 rounds** + fill time with easy march.
- **Coaching:** Log how you felt (**1–10** energy). Adjust Week 3+ in a full program based on recovery.

> **Weekly targets:** **2 rest days** minimum (non-consecutive if possible). **Water + protein** after sessions; walk **10 min** on rest days for blood flow.
`.trim(),
  },
];
