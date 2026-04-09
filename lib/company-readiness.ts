import { neon } from "@neondatabase/serverless";
import { EVENT_ORDER, type EventKey } from "@/lib/aft-scoring";
import { weakEventLabelsBelow } from "@/lib/groups";
import { formatMilitaryRankDisplay } from "@/lib/military-rank";

export const AFT_GENERAL_PASS = 300;
export const AFT_COMBAT_PASS = 350;

export type ReadinessMemberRow = {
  userId: string;
  name: string;
  militaryRankDisplay: string;
  component: string;
  isNgOrReserve: boolean;
  bestTotal: number;
  passGeneral: boolean;
  passCombat: boolean;
  /** Calendar date of most recent score_history row (any score). */
  lastTestDate: string | null;
  daysSinceLastTest: number | null;
  weakEvents: string[];
  eventScores: Record<EventKey, number>;
};

export type ReadinessRiskRow = {
  userId: string;
  name: string;
  bestTotal: number;
  kind: "combat_at_risk" | "close_to_fail";
  weakEvents: string[];
};

export type EventAvgRow = { key: EventKey; label: string; avg: number };

/** Highest severity first when sorting the at-risk roster. */
export type AutomatedAftRiskKind =
  | "failed_last_test"
  | "declining_performance"
  | "borderline_at_risk"
  | "inactive_no_recent_test";

export type AtRiskRosterRow = {
  userId: string;
  name: string;
  militaryRankDisplay: string;
  /** Display tier for color coding: failed = high (red), declining = moderate (orange), borderline/inactive = watch (yellow). */
  riskLevel: "High" | "Moderate" | "Watch";
  riskReason: string;
  suggestedAction: string;
  /** e.g. "285 / 300" or "—" when no scores. */
  currentScoreRequiredDisplay: string;
  weakEvents: string[];
  kind: AutomatedAftRiskKind;
};

export type CompanyReadinessData = {
  groupName: string;
  members: ReadinessMemberRow[];
  passingGeneral: number;
  passingCombat: number;
  readinessPct: number | null;
  eventAverages: EventAvgRow[];
  ngTotal: number;
  ngCurrent: number;
  adTotal: number;
  adCurrent: number;
  stale365: { id: string; name: string }[];
  stale180: { id: string; name: string }[];
  riskRows: ReadinessRiskRow[];
  atRiskRoster: AtRiskRosterRow[];
};

const SHORT_EVENT: Record<EventKey, string> = {
  mdl: "MDL",
  hrp: "HRP",
  sdc: "SDC",
  plk: "PLK",
  twoMR: "2MR",
};

function normComponent(raw: string | null | undefined): string {
  const t = String(raw ?? "Active Duty").trim();
  return t || "Active Duty";
}

export function isNgOrReserveComponent(component: string): boolean {
  const c = component.trim();
  return c === "National Guard" || c === "Army Reserve";
}

function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate()
  );
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((b - a) / 86400000);
}

/** Minimum total on the soldier’s most recent test (general vs combat MOS bar). */
function passTotalRequired(isCombatMos: boolean): number {
  return isCombatMos ? AFT_COMBAT_PASS : AFT_GENERAL_PASS;
}

const AUTOMATED_RISK_SEVERITY: Record<AutomatedAftRiskKind, number> = {
  failed_last_test: 0,
  declining_performance: 1,
  borderline_at_risk: 2,
  inactive_no_recent_test: 3,
};

const AUTOMATED_RISK_COPY: Record<
  AutomatedAftRiskKind,
  { riskReason: string; suggestedAction: string; riskLevel: AtRiskRosterRow["riskLevel"] }
> = {
  failed_last_test: {
    riskReason: "FAILED LAST TEST",
    suggestedAction:
      "Schedule retest and assign focused PT plan targeting weak events",
    riskLevel: "High",
  },
  declining_performance: {
    riskReason: "DECLINING PERFORMANCE",
    suggestedAction:
      "Review training plan. Check for injury or profile status.",
    riskLevel: "Moderate",
  },
  borderline_at_risk: {
    riskReason: "BORDERLINE — AT RISK",
    suggestedAction:
      "Assign extra PT for weak events. Monitor closely.",
    riskLevel: "Watch",
  },
  inactive_no_recent_test: {
    riskReason: "INACTIVE — NO RECENT TEST",
    suggestedAction: "Follow up with soldier. No test data on record.",
    riskLevel: "Watch",
  },
};

function scoreRequiredForKind(
  kind: AutomatedAftRiskKind,
  latestTotal: number | null,
  isCombatMos: boolean
): number {
  if (kind === "borderline_at_risk" && latestTotal != null) {
    if (latestTotal >= 270 && latestTotal <= 299) return AFT_GENERAL_PASS;
    if (latestTotal >= 300 && latestTotal <= 349) return AFT_COMBAT_PASS;
  }
  if (kind === "inactive_no_recent_test") return AFT_GENERAL_PASS;
  return passTotalRequired(isCombatMos);
}

function formatCurrentRequiredDisplay(
  latestTotal: number | null,
  required: number
): string {
  if (latestTotal == null) return "—";
  return `${Math.round(latestTotal)} / ${required}`;
}

export async function loadCompanyReadiness(
  dbUrl: string,
  groupId: string
): Promise<CompanyReadinessData> {
  const sql = neon(dbUrl);

  const groupRaw = await sql`
    SELECT name FROM "groups"
    WHERE id = ${groupId}::uuid
    LIMIT 1
  `;
  const groupName = String((groupRaw as { name: string }[])[0]?.name ?? "Unit");

  const membersRaw = await sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "groups" WHERE id = ${groupId}::uuid
      UNION ALL
      SELECT g.id FROM "groups" g
      INNER JOIN subtree s ON g.parent_group_id = s.id
    )
    SELECT DISTINCT ON (gm.user_id)
      gm.user_id::text AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.military_rank,
      COALESCE(ep.component, 'Active Duty') AS component,
      COALESCE(NULLIF(TRIM(ep.aft_mos_standard), ''), 'general') AS aft_mos_standard
    FROM group_members gm
    INNER JOIN users u ON u.id = gm.user_id
    LEFT JOIN enlistment_profiles ep ON ep.user_id = gm.user_id
    WHERE gm.group_id IN (SELECT id FROM subtree)
    ORDER BY gm.user_id
  `;

  type MRow = {
    user_id: string;
    user_name: string | null;
    user_email: string | null;
    military_rank: string | null;
    component: string;
    aft_mos_standard: string;
  };

  const mrows = membersRaw as MRow[];
  const combatMosByUser = new Map<string, boolean>();
  for (const m of mrows) {
    combatMosByUser.set(
      m.user_id,
      String(m.aft_mos_standard ?? "general").trim().toLowerCase() ===
        "combat"
    );
  }

  if (mrows.length === 0) {
    return {
      groupName,
      members: [],
      passingGeneral: 0,
      passingCombat: 0,
      readinessPct: null,
      eventAverages: EVENT_ORDER.map((k) => ({
        key: k,
        label: SHORT_EVENT[k],
        avg: 0,
      })),
      ngTotal: 0,
      ngCurrent: 0,
      adTotal: 0,
      adCurrent: 0,
      stale365: [],
      stale180: [],
      riskRows: [],
      atRiskRoster: [],
    };
  }

  const ranked = await sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "groups" WHERE id = ${groupId}::uuid
      UNION ALL
      SELECT g.id FROM "groups" g
      INNER JOIN subtree s ON g.parent_group_id = s.id
    ),
    ranked AS (
      SELECT
        sh.user_id,
        sh.total_score,
        sh.event_scores,
        sh.created_at,
        ROW_NUMBER() OVER (
          PARTITION BY sh.user_id
          ORDER BY sh.total_score DESC, sh.created_at DESC
        ) AS rn
      FROM score_history sh
      INNER JOIN group_members gm
        ON gm.user_id = sh.user_id AND gm.group_id IN (SELECT id FROM subtree)
    )
    SELECT
      r.user_id::text,
      r.total_score,
      r.event_scores,
      r.created_at
    FROM ranked r
    WHERE r.rn = 1
  `;

  const bestByUser = new Map<
    string,
    {
      total_score: number;
      event_scores: Record<string, unknown>;
      created_at: string | Date;
    }
  >();
  for (const r of ranked as {
    user_id: string;
    total_score: number;
    event_scores: Record<string, unknown>;
    created_at: string | Date;
  }[]) {
    bestByUser.set(r.user_id, {
      total_score: Number(r.total_score ?? 0),
      event_scores:
        r.event_scores && typeof r.event_scores === "object"
          ? r.event_scores
          : {},
      created_at: r.created_at,
    });
  }

  const lastRaw = await sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "groups" WHERE id = ${groupId}::uuid
      UNION ALL
      SELECT g.id FROM "groups" g
      INNER JOIN subtree s ON g.parent_group_id = s.id
    ),
    m AS (
      SELECT DISTINCT gm.user_id
      FROM group_members gm
      WHERE gm.group_id IN (SELECT id FROM subtree)
    )
    SELECT sh.user_id::text AS user_id, MAX(sh.created_at) AS last_at
    FROM score_history sh
    INNER JOIN m ON m.user_id = sh.user_id
    GROUP BY sh.user_id
  `;

  const lastByUser = new Map<string, Date>();
  for (const row of lastRaw as { user_id: string; last_at: string | Date }[]) {
    const d =
      row.last_at instanceof Date
        ? row.last_at
        : new Date(String(row.last_at));
    if (!Number.isNaN(d.getTime())) lastByUser.set(row.user_id, d);
  }

  const recentTwoRaw = await sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "groups" WHERE id = ${groupId}::uuid
      UNION ALL
      SELECT g.id FROM "groups" g
      INNER JOIN subtree s ON g.parent_group_id = s.id
    ),
    m AS (
      SELECT DISTINCT gm.user_id
      FROM group_members gm
      WHERE gm.group_id IN (SELECT id FROM subtree)
    ),
    ranked AS (
      SELECT
        sh.user_id::text AS user_id,
        sh.total_score,
        sh.event_scores,
        sh.created_at,
        ROW_NUMBER() OVER (
          PARTITION BY sh.user_id
          ORDER BY sh.created_at DESC
        ) AS rn
      FROM score_history sh
      INNER JOIN m ON m.user_id = sh.user_id
    )
    SELECT user_id, total_score, event_scores, created_at, rn
    FROM ranked
    WHERE rn <= 2
  `;

  type ScoreSnap = {
    total_score: number;
    event_scores: Record<string, unknown>;
    created_at: string | Date;
  };
  const latestRecent = new Map<string, ScoreSnap>();
  const prevRecent = new Map<string, ScoreSnap>();
  for (const r of recentTwoRaw as {
    user_id: string;
    total_score: number;
    event_scores: Record<string, unknown>;
    created_at: string | Date;
    rn: number;
  }[]) {
    const snap: ScoreSnap = {
      total_score: Number(r.total_score ?? 0),
      event_scores:
        r.event_scores && typeof r.event_scores === "object"
          ? r.event_scores
          : {},
      created_at: r.created_at,
    };
    if (r.rn === 1) latestRecent.set(r.user_id, snap);
    else if (r.rn === 2) prevRecent.set(r.user_id, snap);
  }

  const now = new Date();
  const ms365 = 365 * 86400000;
  const ms180 = 180 * 86400000;

  const members: ReadinessMemberRow[] = [];
  let passingGeneral = 0;
  let passingCombat = 0;
  let ngTotal = 0;
  let ngCurrent = 0;
  let adTotal = 0;
  let adCurrent = 0;

  const stale365: { id: string; name: string }[] = [];
  const stale180: { id: string; name: string }[] = [];

  for (const m of mrows) {
    const displayName =
      m.user_name?.trim() || m.user_email?.split("@")[0] || "Athlete";
    const component = normComponent(m.component);
    const ng = isNgOrReserveComponent(component);
    const best = bestByUser.get(m.user_id);
    const bestTotal = best?.total_score ?? 0;
    const eventScores = {} as Record<EventKey, number>;
    if (best?.event_scores) {
      for (const k of EVENT_ORDER) {
        const v = best.event_scores[k];
        if (typeof v === "number") eventScores[k] = v;
      }
    }

    const passGeneral = bestTotal >= AFT_GENERAL_PASS;
    const passCombat = bestTotal >= AFT_COMBAT_PASS;
    if (passGeneral) passingGeneral += 1;
    if (passCombat) passingCombat += 1;

    const lastTestAt = lastByUser.get(m.user_id) ?? null;
    let daysSinceLastTest: number | null = null;
    if (lastTestAt) {
      daysSinceLastTest = daysBetween(lastTestAt, now);
    }

    const lastTestDate = lastTestAt
      ? lastTestAt.toISOString().slice(0, 10)
      : null;

    if (ng) {
      ngTotal += 1;
      if (lastTestAt && now.getTime() - lastTestAt.getTime() <= ms365) {
        ngCurrent += 1;
      }
    } else {
      adTotal += 1;
      if (lastTestAt && now.getTime() - lastTestAt.getTime() <= ms180) {
        adCurrent += 1;
      }
    }

    if (!lastTestAt || now.getTime() - lastTestAt.getTime() > ms365) {
      stale365.push({ id: m.user_id, name: displayName });
    }
    if (!lastTestAt || now.getTime() - lastTestAt.getTime() > ms180) {
      stale180.push({ id: m.user_id, name: displayName });
    }

    members.push({
      userId: m.user_id,
      name: displayName,
      militaryRankDisplay: formatMilitaryRankDisplay(m.military_rank),
      component,
      isNgOrReserve: ng,
      bestTotal,
      passGeneral,
      passCombat,
      lastTestDate,
      daysSinceLastTest,
      weakEvents: best
        ? weakEventLabelsBelow(best.event_scores, 75)
        : [],
      eventScores,
    });
  }

  members.sort((a, b) => b.bestTotal - a.bestTotal);

  const n = members.length;
  const readinessPct =
    n > 0 ? Math.round((passingGeneral / n) * 1000) / 10 : null;

  const eventAverages: EventAvgRow[] = EVENT_ORDER.map((k) => {
    const sum = members.reduce((s, r) => s + (r.eventScores[k] ?? 0), 0);
    return {
      key: k,
      label: SHORT_EVENT[k],
      avg: n > 0 ? Math.round((sum / n) * 10) / 10 : 0,
    };
  });

  const riskRows: ReadinessRiskRow[] = [];
  for (const r of members) {
    const t = r.bestTotal;
    const weak = r.weakEvents;
    if (t >= 300 && t <= 349) {
      riskRows.push({
        userId: r.userId,
        name: r.name,
        bestTotal: t,
        kind: "combat_at_risk",
        weakEvents: weak,
      });
    } else if (t >= 270 && t <= 299) {
      riskRows.push({
        userId: r.userId,
        name: r.name,
        bestTotal: t,
        kind: "close_to_fail",
        weakEvents: weak,
      });
    }
  }

  const atRiskBuilt: (AtRiskRosterRow & { __sort: number })[] = [];
  for (const row of members) {
    const isCombatMos = combatMosByUser.get(row.userId) ?? false;
    const latest = latestRecent.get(row.userId) ?? null;
    const prev = prevRecent.get(row.userId) ?? null;
    const lastTestAt = lastByUser.get(row.userId) ?? null;

    const msStale = row.isNgOrReserve ? ms365 : ms180;
    const inactive =
      !lastTestAt ||
      Number.isNaN(lastTestAt.getTime()) ||
      now.getTime() - lastTestAt.getTime() > msStale;

    const latestTotal = latest ? latest.total_score : null;
    const reqPass = passTotalRequired(isCombatMos);
    const failedLast =
      latestTotal != null && latestTotal < reqPass;

    const declining =
      latest != null &&
      prev != null &&
      latest.total_score <= prev.total_score - 10;

    let borderline = false;
    if (latestTotal != null) {
      if (
        (latestTotal >= 270 && latestTotal <= 299) ||
        (latestTotal >= 300 && latestTotal <= 349)
      ) {
        borderline = true;
      }
    }

    const kinds: AutomatedAftRiskKind[] = [];
    if (failedLast) kinds.push("failed_last_test");
    if (declining) kinds.push("declining_performance");
    if (borderline) kinds.push("borderline_at_risk");
    if (inactive) kinds.push("inactive_no_recent_test");

    if (kinds.length === 0) continue;

    kinds.sort(
      (a, b) => AUTOMATED_RISK_SEVERITY[a] - AUTOMATED_RISK_SEVERITY[b]
    );
    const kind = kinds[0]!;
    const copy = AUTOMATED_RISK_COPY[kind];
    const required = scoreRequiredForKind(kind, latestTotal, isCombatMos);
    const weak = latest
      ? weakEventLabelsBelow(latest.event_scores, 75)
      : [];

    atRiskBuilt.push({
      userId: row.userId,
      name: row.name,
      militaryRankDisplay: row.militaryRankDisplay,
      riskLevel: copy.riskLevel,
      riskReason: copy.riskReason,
      suggestedAction: copy.suggestedAction,
      currentScoreRequiredDisplay: formatCurrentRequiredDisplay(
        latestTotal,
        required
      ),
      weakEvents: weak,
      kind,
      __sort: latestTotal ?? Number.POSITIVE_INFINITY,
    });
  }

  atRiskBuilt.sort((a, b) => {
    const d = AUTOMATED_RISK_SEVERITY[a.kind] - AUTOMATED_RISK_SEVERITY[b.kind];
    if (d !== 0) return d;
    return a.__sort - b.__sort;
  });
  const atRiskRoster: AtRiskRosterRow[] = [];
  for (const b of atRiskBuilt) {
    const { __sort, ...rest } = b;
    void __sort;
    atRiskRoster.push(rest);
  }

  stale365.sort((a, b) => a.name.localeCompare(b.name));
  stale180.sort((a, b) => a.name.localeCompare(b.name));

  return {
    groupName,
    members,
    passingGeneral,
    passingCombat,
    readinessPct,
    eventAverages,
    ngTotal,
    ngCurrent,
    adTotal,
    adCurrent,
    stale365,
    stale180,
    riskRows,
    atRiskRoster,
  };
}
