import type { AnalyzeResponseBody } from "@/lib/analyze-types";
import { EVENT_ORDER, type EventKey } from "@/lib/aft-scoring";
import { LS_HISTORY_KEY } from "@/lib/storage-keys";

export type HistoryEntry = {
  date: string;
  ageGroup: string;
  gender: string;
  totalScore: number;
  eventScores: Record<EventKey, number>;
  timestamp: number;
  /** Present when loaded from the database */
  historyId?: string;
};

const MAX = 5;

function loadRaw(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HistoryEntry =>
        e &&
        typeof e === "object" &&
        typeof (e as HistoryEntry).timestamp === "number"
    );
  } catch {
    return [];
  }
}

export function readHistory(): HistoryEntry[] {
  return loadRaw();
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(LS_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export function mapDbRowToHistoryEntry(row: {
  id: string;
  age_group: string;
  gender: string;
  total_score: number;
  event_scores: Record<string, unknown>;
  created_at: string | Date;
}): HistoryEntry {
  const ts =
    row.created_at instanceof Date
      ? row.created_at.getTime()
      : new Date(row.created_at).getTime();
  const eventScores = {} as Record<EventKey, number>;
  for (const k of EVENT_ORDER) {
    const v = row.event_scores[k];
    if (typeof v === "number") eventScores[k] = v;
  }
  return {
    date: new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    ageGroup: row.age_group,
    gender: row.gender,
    totalScore: row.total_score,
    eventScores,
    timestamp: ts,
    historyId: row.id,
  };
}

export function appendHistoryFromResult(data: AnalyzeResponseBody): void {
  const eventScores = {} as Record<EventKey, number>;
  for (const k of EVENT_ORDER) {
    const ev = data.events.find((e) => e.key === k);
    if (ev) eventScores[k] = ev.score;
  }
  const entry: HistoryEntry = {
    date: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    ageGroup: data.ageGroup ?? "—",
    gender: data.gender === "female" ? "Female" : "Male",
    totalScore: data.totalScore,
    eventScores,
    timestamp: Date.now(),
  };
  const prev = loadRaw();
  const next = [entry, ...prev.filter((e) => e.timestamp !== entry.timestamp)]
    .slice(0, MAX);
  try {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function isHistoryOverallPass(eventScores: Record<EventKey, number>): boolean {
  return EVENT_ORDER.every((k) => (eventScores[k] ?? 0) >= 60);
}
