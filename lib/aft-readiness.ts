import {
  scoreEvent,
  type AgeGroup,
  type Gender,
} from "@/lib/aft-scoring";

function ageToAgeGroup(age: number): AgeGroup {
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

function normalizeGender(gender: string): Gender {
  const t = gender.trim().toLowerCase();
  return t === "female" ? "female" : "male";
}

/**
 * Rough readiness vs official AFT minimum standards using only HRP and 2MR
 * (Hand-Release Push-Up reps and estimated two-mile run from a 1-mile time).
 * 1-mile time is doubled to approximate a 2-mile effort for scoring tables.
 */
export function estimateAftReadiness(
  hrpReps: number,
  runMinutes: number,
  runSeconds: number,
  age: number,
  gender: string
): number {
  const ageGroup = ageToAgeGroup(age);
  const g = normalizeGender(gender);
  const hrp = Math.max(0, Math.floor(hrpReps));
  const sec =
    Math.max(0, Math.floor(runMinutes)) * 60 + Math.max(0, Math.floor(runSeconds));
  const hrpScore = scoreEvent("hrp", ageGroup, g, hrp);
  const estimatedTwoMileSec = sec * 2;
  const runScore = scoreEvent("twoMR", ageGroup, g, estimatedTwoMileSec);
  const avg = (hrpScore + runScore) / 2;
  return Math.round(Math.min(100, Math.max(0, avg)));
}
