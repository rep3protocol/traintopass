import type { EventKey } from "@/lib/aft-scoring";
import { EVENT_ORDER, EVENT_LABELS } from "@/lib/aft-scoring";

const JOIN_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateJoinCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)]!;
  }
  return s;
}

export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function weakEventLabelsBelow(
  eventScores: Record<string, unknown>,
  threshold: number
): string[] {
  const out: string[] = [];
  for (const k of EVENT_ORDER) {
    const v = eventScores[k];
    if (typeof v === "number" && v < threshold) {
      out.push(EVENT_LABELS[k as EventKey]);
    }
  }
  return out;
}

export type ScoreDayRow = {
  user_id: string;
  total_score: number;
  day: string;
};

/**
 * One point per calendar day: average of each member's best score that day (max if multiple same day).
 */
export function buildGroupAverageByDay(rows: ScoreDayRow[]): { date: string; avg: number }[] {
  type DayAgg = Map<string, number>;
  const byDay = new Map<string, DayAgg>();

  for (const r of rows) {
    if (!r.day) continue;
    let m = byDay.get(r.day);
    if (!m) {
      m = new Map();
      byDay.set(r.day, m);
    }
    const prev = m.get(r.user_id);
    const next = Math.max(prev ?? 0, r.total_score);
    m.set(r.user_id, next);
  }

  const dates = Array.from(byDay.keys()).sort();
  const points: { date: string; avg: number }[] = [];
  for (const d of dates) {
    const m = byDay.get(d)!;
    const vals = Array.from(m.values());
    if (vals.length === 0) continue;
    const sum = vals.reduce((a, b) => a + b, 0);
    points.push({ date: d, avg: sum / vals.length });
  }
  return points;
}
