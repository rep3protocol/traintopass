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

const MDL_M_MAX = [340, 350, 350, 350, 350, 350, 340, 330, 250, 230];
const MDL_F_MAX = [220, 230, 240, 230, 220, 210, 200, 190, 170, 170];
const MDL_M_MIN60 = [150, 150, 150, 140, 140, 140, 140, 140, 140, 140];
const MDL_F_MIN60 = [120, 120, 120, 120, 120, 120, 120, 120, 120, 120];

const HRP_M_MAX = [58, 61, 62, 60, 59, 57, 55, 51, 46, 43];
const HRP_F_MAX = [53, 50, 48, 47, 43, 40, 38, 36, 24, 24];
const HRP_M_MIN60 = [15, 14, 14, 13, 12, 11, 11, 10, 10, 10];
const HRP_F_MIN60 = [11, 11, 11, 11, 10, 10, 10, 10, 10, 10];

/** SDC & 2MR: 100 pts at this time (seconds); lower is better. */
const SDC_M_T100 = [89, 90, 90, 93, 96, 100, 105, 112, 118, 129];
const SDC_M_T60 = [148, 151, 152, 156, 161, 165, 173, 180, 192, 196];
const SDC_F_T100 = [115, 115, 115, 119, 122, 129, 131, 138, 146, 146];
const SDC_F_T60 = [195, 195, 195, 202, 207, 222, 231, 243, 288, 288];

/** PLK: same both genders; longer time = better. 100 pts / 60 pts thresholds in seconds. */
const PLK_T100 = [220, 215, 210, 205, 200, 200, 200, 200, 200, 200];
const PLK_T60 = [90, 85, 80, 75, 70, 70, 70, 70, 70, 70];

const MR_M_T100 = [802, 805, 805, 822, 822, 845, 870, 909, 928, 928];
const MR_M_T60 = [1197, 1185, 1185, 1244, 1244, 1324, 1324, 1370, 1416, 1416];
const MR_F_T100 = [960, 930, 930, 948, 951, 960, 990, 1019, 1038, 1038];
const MR_F_T60 = [1375, 1365, 1365, 1370, 1379, 1395, 1410, 1440, 1488, 1500];

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

function ageIndex(ageGroup: AgeGroup): number {
  return AGE_GROUPS.indexOf(ageGroup);
}

/** Higher raw value = better (MDL lbs, HRP reps). */
function scoreHigherBetter(value: number, min60: number, max100: number): number {
  if (value >= max100) return 100;
  if (value <= 0) return 0;
  if (value < min60) {
    return clampScore((value / min60) * 60);
  }
  return clampScore(
    60 + ((value - min60) / (max100 - min60)) * 40
  );
}

/** Lower time (seconds) = better (SDC, 2MR). t100 < t60. */
function scoreTimeLowerBetter(timeSec: number, t100: number, t60: number): number {
  if (timeSec <= t100) return 100;
  const tZero = t60 + (t60 - t100);
  if (timeSec >= tZero) return 0;
  if (timeSec <= t60) {
    return clampScore(
      100 - ((timeSec - t100) / (t60 - t100)) * 40
    );
  }
  return clampScore(((tZero - timeSec) / (tZero - t60)) * 60);
}

/** Longer time (seconds) = better (PLK). t60 < t100. */
function scoreTimeHigherBetter(timeSec: number, t60: number, t100: number): number {
  if (timeSec >= t100) return 100;
  if (timeSec <= 0) return 0;
  if (timeSec < t60) {
    return clampScore((timeSec / t60) * 60);
  }
  return clampScore(
    60 + ((timeSec - t60) / (t100 - t60)) * 40
  );
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
  const i = ageIndex(ageGroup);
  if (i < 0) return 0;

  if (event === "mdl") {
    const max100 = gender === "male" ? MDL_M_MAX[i] : MDL_F_MAX[i];
    const min60 = gender === "male" ? MDL_M_MIN60[i] : MDL_F_MIN60[i];
    return scoreHigherBetter(value, min60, max100);
  }

  if (event === "hrp") {
    const max100 = gender === "male" ? HRP_M_MAX[i] : HRP_F_MAX[i];
    const min60 = gender === "male" ? HRP_M_MIN60[i] : HRP_F_MIN60[i];
    return scoreHigherBetter(value, min60, max100);
  }

  if (event === "sdc") {
    const t100 = gender === "male" ? SDC_M_T100[i] : SDC_F_T100[i];
    const t60 = gender === "male" ? SDC_M_T60[i] : SDC_F_T60[i];
    return scoreTimeLowerBetter(value, t100, t60);
  }

  if (event === "plk") {
    return scoreTimeHigherBetter(value, PLK_T60[i], PLK_T100[i]);
  }

  if (event === "twoMR") {
    const t100 = gender === "male" ? MR_M_T100[i] : MR_F_T100[i];
    const t60 = gender === "male" ? MR_M_T60[i] : MR_F_T60[i];
    return scoreTimeLowerBetter(value, t100, t60);
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
