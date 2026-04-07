import officialRows from "@/lib/aft-score-tables.json";

export type Gender = "male" | "female";

export const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export type AgeGroup =
  | "17-21"
  | "22-26"
  | "27-31"
  | "32-36"
  | "37-41"
  | "42-46"
  | "47-51"
  | "52-56"
  | "57-61"
  | "62+";

export const AGE_GROUPS: AgeGroup[] = [
  "17-21",
  "22-26",
  "27-31",
  "32-36",
  "37-41",
  "42-46",
  "47-51",
  "52-56",
  "57-61",
  "62+",
];

export type EventKey = "mdl" | "hrp" | "sdc" | "plk" | "twoMR";

export const EVENT_ORDER: EventKey[] = [
  "mdl",
  "hrp",
  "sdc",
  "plk",
  "twoMR",
];

export const EVENT_LABELS: Record<EventKey, string> = {
  mdl: "3 Repetition Maximum Deadlift (MDL)",
  hrp: "Hand-Release Push-Up (HRP)",
  sdc: "Sprint-Drag-Carry (SDC)",
  plk: "Plank (PLK)",
  twoMR: "Two-Mile Run (2MR)",
};

/** Official AFT tables — Army Fitness Test Score Tables, Approved 15 May 2025, Effective 1 June 2025. Index matches AGE_GROUPS order. */

function ageIndex(ageGroup: AgeGroup): number {
  return AGE_GROUPS.indexOf(ageGroup);
}

type OfficialRows = Record<
  EventKey,
  Record<string, Array<number | null>>
>;

const OFFICIAL_ROWS = officialRows as OfficialRows;

function scoreFromOfficialRows(
  event: EventKey,
  ageGroup: AgeGroup,
  gender: Gender,
  value: number,
  lowerIsBetter: boolean
): number {
  if (!Number.isFinite(value)) return 0;
  const i = ageIndex(ageGroup);
  if (i < 0) return 0;
  const col = i * 2 + (gender === "female" ? 1 : 0);
  const rows = OFFICIAL_ROWS[event];
  for (let score = 100; score >= 0; score -= 1) {
    const row = rows[String(score)];
    if (!row) continue;
    const threshold = row[col];
    if (threshold == null) continue;
    if (lowerIsBetter ? value <= threshold : value >= threshold) {
      return score;
    }
  }
  return 0;
}

export function parseMmSsToSeconds(s: string): number | null {
  const t = s.trim();
  const m = /^(\d+):(\d{2})$/.exec(t);
  if (!m) return null;
  const minutes = Number(m[1]);
  const seconds = Number(m[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) {
    return null;
  }
  return minutes * 60 + seconds;
}

export function formatSecondsAsMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function scoreEvent(
  event: EventKey,
  ageGroup: AgeGroup,
  gender: Gender,
  value: number
): number {
  if (event === "mdl") {
    return scoreFromOfficialRows(event, ageGroup, gender, value, false);
  }

  if (event === "hrp") {
    return scoreFromOfficialRows(event, ageGroup, gender, value, false);
  }

  if (event === "sdc") {
    return scoreFromOfficialRows(event, ageGroup, gender, value, true);
  }

  if (event === "plk") {
    return scoreFromOfficialRows(event, ageGroup, gender, value, false);
  }

  if (event === "twoMR") {
    return scoreFromOfficialRows(event, ageGroup, gender, value, true);
  }

  return 0;
}

export type EventStatus = "pass" | "borderline" | "fail";

export function eventStatus(score: number): EventStatus {
  if (score >= 60 && score < 75) return "borderline";
  if (score >= 75) return "pass";
  return "fail";
}

export function progressTone(score: number): "green" | "yellow" | "red" {
  if (score >= 75) return "green";
  if (score >= 60) return "yellow";
  return "red";
}

/** Maps calendar age to AFT age-group bucket (same tables as calculator). */
export function ageYearsToAgeGroup(age: number): AgeGroup {
  if (!Number.isFinite(age) || age < 17) return "17-21";
  if (age <= 21) return "17-21";
  if (age <= 26) return "22-26";
  if (age <= 31) return "27-31";
  if (age <= 36) return "32-36";
  if (age <= 41) return "37-41";
  if (age <= 46) return "42-46";
  if (age <= 51) return "47-51";
  if (age <= 56) return "52-56";
  if (age <= 61) return "57-61";
  return "62+";
}

/**
 * Official 60-point (minimum pass) raw standards for the user's age group and gender.
 * For use in coaching prompts — tables match scoreEvent() inputs.
 */
export function formatAftPassingMinimumsForPrompt(
  age: number,
  gender: Gender
): string {
  const ag = ageYearsToAgeGroup(age);
  const i = ageIndex(ag);
  if (i < 0) return "";
  const col = i * 2 + (gender === "female" ? 1 : 0);
  const score60Rows = {
    mdl: OFFICIAL_ROWS.mdl["60"]?.[col],
    hrp: OFFICIAL_ROWS.hrp["60"]?.[col],
    sdc: OFFICIAL_ROWS.sdc["60"]?.[col],
    plk: OFFICIAL_ROWS.plk["60"]?.[col],
    twoMR: OFFICIAL_ROWS.twoMR["60"]?.[col],
  };
  if (
    score60Rows.mdl == null ||
    score60Rows.hrp == null ||
    score60Rows.sdc == null ||
    score60Rows.plk == null ||
    score60Rows.twoMR == null
  ) {
    return "";
  }

  const mdlMin = score60Rows.mdl;
  const hrpMin = score60Rows.hrp;
  const sdcMax = score60Rows.sdc;
  const plkMin = score60Rows.plk;
  const twoMrMax = score60Rows.twoMR;

  return [
    `AFT age group: ${ag} (${gender === "male" ? "Male" : "Female"}). Minimum passing (60-point) raw standards from the official May 2025 tables:`,
    `- MDL (3-rep hex/trap bar deadlift): at least ${mdlMin} lb`,
    `- HRP (Hand-Release Push-Up, 2 min): at least ${hrpMin} reps`,
    `- SDC (Sprint-Drag-Carry): total time must be ${formatSecondsAsMmSs(sdcMax)} or faster`,
    `- PLK (plank): hold at least ${formatSecondsAsMmSs(plkMin)}`,
    `- 2MR (two-mile run): finish in ${formatSecondsAsMmSs(twoMrMax)} or faster`,
  ].join("\n");
}
