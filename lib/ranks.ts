export type RankId =
  | "E-1"
  | "E-2"
  | "E-3"
  | "E-4-CPL"
  | "E-4-SPC"
  | "E-5"
  | "E-6"
  | "E-7"
  | "E-8-MSG"
  | "E-8-1SG"
  | "E-9-SGM"
  | "E-9-CSM"
  | "E-9-SMA";

export const RANK_ORDER: RankId[] = [
  "E-1",
  "E-2",
  "E-3",
  "E-4-CPL",
  "E-4-SPC",
  "E-5",
  "E-6",
  "E-7",
  "E-8-MSG",
  "E-8-1SG",
  "E-9-SGM",
  "E-9-CSM",
  "E-9-SMA",
];

export function rankTierIndex(id: RankId): number {
  const i = RANK_ORDER.indexOf(id);
  return i < 0 ? 0 : i;
}

export function rankDisplayGrade(id: RankId): string {
  if (id.startsWith("E-4")) return "E-4";
  if (id.startsWith("E-8")) return "E-8";
  if (id.startsWith("E-9")) return "E-9";
  return id;
}

export function rankName(id: RankId): string {
  switch (id) {
    case "E-1":
      return "Private";
    case "E-2":
      return "Private";
    case "E-3":
      return "Private First Class";
    case "E-4-CPL":
      return "Corporal";
    case "E-4-SPC":
      return "Specialist";
    case "E-5":
      return "Sergeant";
    case "E-6":
      return "Staff Sergeant";
    case "E-7":
      return "Sergeant First Class";
    case "E-8-MSG":
      return "Master Sergeant";
    case "E-8-1SG":
      return "First Sergeant";
    case "E-9-SGM":
      return "Sergeant Major";
    case "E-9-CSM":
      return "Command Sergeant Major";
    case "E-9-SMA":
      return "Sergeant Major of the Army";
    default:
      return "Private";
  }
}

export type RankComputeContext = {
  paid: boolean;
  assessmentCount: number;
  bestScore: number;
  streak: number;
  generalProgramComplete: boolean;
  planWeek12Viewed: boolean;
  /** Competition rank in age/gender bucket; null if unknown */
  leaderboardRank: number | null;
};

export function computeRawRank(ctx: RankComputeContext): RankId {
  const {
    paid,
    assessmentCount,
    bestScore,
    streak,
    generalProgramComplete,
    planWeek12Viewed,
    leaderboardRank,
  } = ctx;

  if (
    paid &&
    leaderboardRank != null &&
    leaderboardRank >= 1 &&
    leaderboardRank <= 10
  ) {
    if (leaderboardRank === 1) return "E-9-SMA";
    return "E-9-CSM";
  }

  if (paid && bestScore >= 480) return "E-9-SGM";
  if (paid && bestScore >= 450) return "E-8-1SG";
  if (paid && bestScore >= 425 && generalProgramComplete) return "E-8-MSG";
  if (paid && bestScore >= 400) return "E-7";
  if (paid && (streak >= 30 || generalProgramComplete)) return "E-6";
  if (paid && bestScore >= 350) return "E-5";
  if (paid && streak >= 7) return "E-4-SPC";
  if (paid && planWeek12Viewed) return "E-4-CPL";
  if (paid && bestScore >= 300) return "E-3";
  if (assessmentCount >= 1) return "E-2";
  return "E-1";
}

export function effectiveRank(raw: RankId, paid: boolean): RankId {
  if (paid) return raw;
  const cap = rankTierIndex("E-2");
  return rankTierIndex(raw) > cap ? "E-2" : raw;
}

export type NextRankInfo = {
  nextRank: RankId | null;
  nextRankRequirement: string;
  progress: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function getNextRankInfo(
  current: RankId,
  ctx: RankComputeContext
): NextRankInfo {
  const idx = rankTierIndex(current);
  const next = idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1]! : null;

  if (!next) {
    return {
      nextRank: null,
      nextRankRequirement: "Maximum rank achieved",
      progress: 1,
    };
  }

  if (!ctx.paid && rankTierIndex(next) > rankTierIndex("E-2")) {
    return {
      nextRank: next,
      nextRankRequirement: "Unlock Full Access — $7/mo",
      progress: 0,
    };
  }

  const { bestScore, streak, generalProgramComplete, planWeek12Viewed } = ctx;

  switch (next) {
    case "E-2":
      return {
        nextRank: next,
        nextRankRequirement: "Complete your first assessment",
        progress: ctx.assessmentCount >= 1 ? 1 : 0,
      };
    case "E-3":
      return {
        nextRank: next,
        nextRankRequirement: "Score 300+ total on the AFT",
        progress: clamp01((bestScore - 200) / 100),
      };
    case "E-4-CPL":
      return {
        nextRank: next,
        nextRankRequirement: "View Week 1–2 of your training plan",
        progress: planWeek12Viewed ? 1 : 0,
      };
    case "E-4-SPC":
      return {
        nextRank: next,
        nextRankRequirement: "Reach a 7-day activity streak",
        progress: clamp01(streak / 7),
      };
    case "E-5":
      return {
        nextRank: next,
        nextRankRequirement: "Score 350+ total on the AFT",
        progress: clamp01((bestScore - 300) / 50),
      };
    case "E-6":
      return {
        nextRank: next,
        nextRankRequirement:
          "Reach a 30-day streak or complete the general training program",
        progress: Math.max(
          clamp01(streak / 30),
          generalProgramComplete ? 1 : 0
        ),
      };
    case "E-7":
      return {
        nextRank: next,
        nextRankRequirement: "Score 400+ total on the AFT",
        progress: clamp01((bestScore - 350) / 50),
      };
    case "E-8-MSG":
      return {
        nextRank: next,
        nextRankRequirement:
          "Score 425+ total and complete the general training program",
        progress: Math.min(
          clamp01((bestScore - 400) / 25),
          generalProgramComplete ? 1 : 0
        ),
      };
    case "E-8-1SG":
      return {
        nextRank: next,
        nextRankRequirement: "Score 450+ total on the AFT",
        progress: clamp01((bestScore - 425) / 25),
      };
    case "E-9-SGM":
      return {
        nextRank: next,
        nextRankRequirement: "Score 480+ total on the AFT",
        progress: clamp01((bestScore - 450) / 30),
      };
    case "E-9-CSM":
      return {
        nextRank: next,
        nextRankRequirement: "Reach top 10 on the leaderboard (your age/gender)",
        progress:
          ctx.leaderboardRank != null && ctx.leaderboardRank <= 10 ? 1 : 0.2,
      };
    case "E-9-SMA":
      return {
        nextRank: next,
        nextRankRequirement: "Reach #1 on the leaderboard (your age/gender)",
        progress: ctx.leaderboardRank === 1 ? 1 : 0.1,
      };
    default:
      return {
        nextRank: next,
        nextRankRequirement: "Keep training",
        progress: 0.25,
      };
  }
}

export function parseRankId(s: string | null | undefined): RankId {
  if (!s || typeof s !== "string") return "E-1";
  const t = s.trim().toUpperCase();
  if ((RANK_ORDER as string[]).includes(t)) return t as RankId;
  return "E-1";
}

/** Badge variant matches RankId */
export type RankBadgeVariant = RankId;
