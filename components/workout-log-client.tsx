"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type WorkoutLogEntry = {
  id: string;
  log_date: string;
  notes: string;
  exercises: unknown[];
  created_at: string;
};

/** Snapshot type for pre-save logs (alias for clarity in feedback state). */
type WorkoutLog = WorkoutLogEntry;

type Exercise = {
  name: string;
  reps?: number;
  weight?: number;
  unit?: "lbs" | "kg";
  time?: string;
};

type ExerciseFormRow = {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  unit: "lbs" | "kg";
  time: string;
  distance: string;
  distanceUnit: "mi" | "km";
  notes: string;
};

function emptyExerciseRow(): ExerciseFormRow {
  return {
    name: "",
    sets: "",
    reps: "",
    weight: "",
    unit: "lbs",
    time: "",
    distance: "",
    distanceUnit: "mi",
    notes: "",
  };
}

function exerciseFromApi(ex: unknown): ExerciseFormRow {
  if (!ex || typeof ex !== "object") return emptyExerciseRow();
  const e = ex as Record<string, unknown>;
  return {
    name: typeof e.name === "string" ? e.name : "",
    sets:
      e.sets != null && e.sets !== ""
        ? String(Number(e.sets))
        : "",
    reps:
      e.reps != null && e.reps !== ""
        ? String(Number(e.reps))
        : "",
    weight:
      e.weight != null && e.weight !== ""
        ? String(Number(e.weight))
        : "",
    unit: e.unit === "kg" ? "kg" : "lbs",
    time: typeof e.time === "string" ? e.time : "",
    distance:
      e.distance != null && e.distance !== ""
        ? String(Number(e.distance))
        : "",
    distanceUnit: e.distanceUnit === "km" ? "km" : "mi",
    notes: typeof e.notes === "string" ? e.notes : "",
  };
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildExercisesPayload(rows: ExerciseFormRow[]): unknown[] {
  return rows
    .map((r) => {
      const name = r.name.trim();
      if (!name) return null;
      const o: Record<string, unknown> = { name };
      const sets = parseInt(r.sets, 10);
      if (!Number.isNaN(sets) && sets >= 1) o.sets = sets;
      const reps = parseInt(r.reps, 10);
      if (!Number.isNaN(reps) && reps >= 0) o.reps = reps;
      const weight = parseFloat(r.weight);
      if (r.weight.trim() !== "" && !Number.isNaN(weight)) {
        o.weight = weight;
        o.unit = r.unit;
      }
      if (r.time.trim()) o.time = r.time.trim();
      const dist = parseFloat(r.distance);
      if (r.distance.trim() !== "" && !Number.isNaN(dist)) {
        o.distance = dist;
        o.distanceUnit = r.distanceUnit;
      }
      if (r.notes.trim()) o.notes = r.notes.trim();
      return o;
    })
    .filter((x): x is Record<string, unknown> => x !== null);
}

function formatListDate(ymd: string): string {
  const t = new Date(ymd + "T12:00:00").getTime();
  if (Number.isNaN(t)) return ymd;
  return new Date(t).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFeedbackHeaderDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

function exerciseFromPayloadItem(ex: unknown): Exercise | null {
  if (!ex || typeof ex !== "object") return null;
  const e = ex as Record<string, unknown>;
  const name = typeof e.name === "string" ? e.name.trim() : "";
  if (!name) return null;
  const out: Exercise = { name };
  if (typeof e.reps === "number" && !Number.isNaN(e.reps)) {
    out.reps = e.reps;
  } else if (e.reps != null && String(e.reps).trim() !== "") {
    const r = parseInt(String(e.reps), 10);
    if (!Number.isNaN(r)) out.reps = r;
  }
  if (e.weight != null && String(e.weight).trim() !== "") {
    const w =
      typeof e.weight === "number" ? e.weight : parseFloat(String(e.weight));
    if (!Number.isNaN(w)) {
      out.weight = w;
      out.unit = e.unit === "kg" ? "kg" : "lbs";
    }
  }
  if (typeof e.time === "string" && e.time.trim()) out.time = e.time.trim();
  return out;
}

function exercisesFromPayload(payload: unknown[]): Exercise[] {
  return payload
    .map(exerciseFromPayloadItem)
    .filter((x): x is Exercise => x !== null);
}

/** Most recent by log_date among all previous log entries with this name. */
function findBestPreviousExerciseAcrossLogs(
  normalizedName: string,
  previousLogs: WorkoutLog[]
): Exercise | null {
  let bestDate = "";
  let bestEx: Exercise | null = null;
  for (const log of previousLogs) {
    const d = log.log_date || "";
    const exs = Array.isArray(log.exercises) ? log.exercises : [];
    for (const raw of exs) {
      const ex = exerciseFromPayloadItem(raw);
      if (!ex || normalizeExerciseName(ex.name) !== normalizedName) continue;
      if (d >= bestDate) {
        bestDate = d;
        bestEx = ex;
      }
    }
  }
  return bestEx;
}

function previousCalendarDayYmd(ymd: string): string {
  const t = new Date(ymd + "T12:00:00");
  t.setDate(t.getDate() - 1);
  return t.toISOString().slice(0, 10);
}

function computeLoggingStreak(logs: WorkoutLog[], startYmd: string): number {
  const dates = new Set(
    logs.map((l) => l.log_date).filter(Boolean) as string[]
  );
  let streak = 0;
  let d = startYmd;
  while (dates.has(d)) {
    streak++;
    d = previousCalendarDayYmd(d);
  }
  return streak;
}

function nameContainsAny(name: string, needles: string[]): boolean {
  const n = name.toLowerCase();
  return needles.some((needle) => n.includes(needle.toLowerCase()));
}

function buildAftImpactMessages(exercises: Exercise[]): string[] {
  const out: string[] = [];
  if (
    exercises.some((e) =>
      nameContainsAny(e.name, ["run", "2 mile", "2mr", "mile"])
    )
  ) {
    out.push(
      "Consistent run training is your fastest path to more AFT points. Every session counts toward your 2MR score."
    );
  }
  if (
    exercises.some((e) =>
      nameContainsAny(e.name, ["push", "hrp", "hand release"])
    )
  ) {
    out.push(
      "Push-up volume builds the HRP base. Stay consistent and you'll see it on test day."
    );
  }
  if (
    exercises.some((e) =>
      nameContainsAny(e.name, ["dead", "mdl", "trap"])
    )
  ) {
    out.push(
      "Deadlift strength transfers directly to your MDL score. Progressive overload is the key."
    );
  }
  return out;
}

type DeltaLine = {
  key: string;
  labelClass: string;
  text: string;
};

function buildPerformanceDeltaLines(
  feedbackExercises: Exercise[],
  previousLogs: WorkoutLog[]
): { hadMatchingExercise: boolean; lines: DeltaLine[] } {
  const lines: DeltaLine[] = [];
  let key = 0;
  let hadMatchingExercise = false;
  for (const cur of feedbackExercises) {
    const prev = findBestPreviousExerciseAcrossLogs(
      normalizeExerciseName(cur.name),
      previousLogs
    );
    if (!prev) continue;
    hadMatchingExercise = true;
    const label = cur.name.trim() || cur.name;
    if (cur.reps != null && prev.reps != null) {
      if (cur.reps > prev.reps) {
        lines.push({
          key: `reps-${key++}`,
          labelClass: "text-emerald-400",
          text: `↑ ${label}: ${prev.reps} → ${cur.reps} reps`,
        });
      } else if (cur.reps < prev.reps) {
        lines.push({
          key: `reps-${key++}`,
          labelClass: "text-neutral-500",
          text: `↓ ${label}: ${prev.reps} → ${cur.reps} reps`,
        });
      }
    }
    if (
      cur.weight != null &&
      prev.weight != null &&
      cur.unit === prev.unit
    ) {
      const unit = cur.unit ?? "lbs";
      if (cur.weight > prev.weight) {
        lines.push({
          key: `w-${key++}`,
          labelClass: "text-emerald-400",
          text: `↑ ${label}: ${prev.weight} → ${cur.weight} ${unit}`,
        });
      } else if (cur.weight < prev.weight) {
        lines.push({
          key: `w-${key++}`,
          labelClass: "text-neutral-500",
          text: `↓ ${label}: ${prev.weight} → ${cur.weight} ${unit}`,
        });
      }
    }
    if (cur.time && prev.time) {
      if (cur.time < prev.time) {
        lines.push({
          key: `t-${key++}`,
          labelClass: "text-emerald-400",
          text: `↑ ${label}: ${prev.time} → ${cur.time}`,
        });
      } else if (cur.time > prev.time) {
        lines.push({
          key: `t-${key++}`,
          labelClass: "text-neutral-500",
          text: `↓ ${label}: ${prev.time} → ${cur.time}`,
        });
      }
    }
  }
  return { hadMatchingExercise, lines };
}

const inputClass =
  "w-full border border-forge-border bg-forge-bg px-3 py-2 text-sm text-white outline-none focus:border-forge-accent";

type Props = {
  userId: string;
};

export function WorkoutLogClient({ userId }: Props) {
  const [logs, setLogs] = useState<WorkoutLogEntry[]>([]);
  const [view, setView] = useState<"list" | "add" | "edit" | "feedback">(
    "list"
  );
  const [feedbackExercises, setFeedbackExercises] = useState<Exercise[]>([]);
  const [previousLogs, setPreviousLogs] = useState<WorkoutLog[]>([]);
  const [editingLog, setEditingLog] = useState<WorkoutLogEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logDate, setLogDate] = useState(todayYmd());
  const [sessionNotes, setSessionNotes] = useState("");
  const [exerciseRows, setExerciseRows] = useState<ExerciseFormRow[]>([
    emptyExerciseRow(),
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workout-logs");
      if (!res.ok) {
        setLogs([]);
        return;
      }
      const data = (await res.json()) as WorkoutLogEntry[];
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs, userId]);

  function openAddToday() {
    setEditingLog(null);
    setLogDate(todayYmd());
    setSessionNotes("");
    setExerciseRows([emptyExerciseRow()]);
    setFormError(null);
    setView("add");
  }

  function openEdit(log: WorkoutLogEntry) {
    setEditingLog(log);
    setLogDate(log.log_date || todayYmd());
    setSessionNotes(log.notes ?? "");
    const ex = Array.isArray(log.exercises) ? log.exercises : [];
    setExerciseRows(
      ex.length > 0 ? ex.map(exerciseFromApi) : [emptyExerciseRow()]
    );
    setFormError(null);
    setView("edit");
  }

  function cancelForm() {
    setView("list");
    setEditingLog(null);
    setFormError(null);
  }

  async function saveWorkout() {
    const payload = buildExercisesPayload(exerciseRows);
    if (payload.length === 0) {
      setFormError("Add at least one exercise with a name.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const body = {
        log_date: logDate,
        notes: sessionNotes,
        exercises: payload,
      };
      if (view === "edit" && editingLog) {
        const res = await fetch(`/api/workout-logs/${editingLog.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setFormError("Could not save. Try again.");
          return;
        }
      } else {
        const res = await fetch("/api/workout-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setFormError("Could not save. Try again.");
          return;
        }
      }
      setPreviousLogs([...logs]);
      setFeedbackExercises(exercisesFromPayload(payload));
      await fetchLogs();
      setEditingLog(null);
      setFormError(null);
      setView("feedback");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLog(id: string) {
    if (!window.confirm("Delete this workout log?")) return;
    const res = await fetch(`/api/workout-logs/${id}`, { method: "DELETE" });
    if (res.ok) await fetchLogs();
  }

  function updateRow(index: number, patch: Partial<ExerciseFormRow>) {
    setExerciseRows((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function removeRow(index: number) {
    setExerciseRows((rows) =>
      rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)
    );
  }

  function addExerciseRow() {
    setExerciseRows((rows) => [...rows, emptyExerciseRow()]);
  }

  function leaveFeedback() {
    setView("list");
    setFeedbackExercises([]);
    setPreviousLogs([]);
  }

  if (view === "feedback") {
    const { hadMatchingExercise, lines: deltaLines } =
      buildPerformanceDeltaLines(feedbackExercises, previousLogs);
    const aftMsgs = buildAftImpactMessages(feedbackExercises);
    const streak = computeLoggingStreak(logs, todayYmd());
    const aftFallback =
      "Every session builds your base. Stay consistent and your AFT score will follow.";

    return (
      <div className="space-y-8 border border-forge-border bg-forge-panel px-6 py-4">
        <header className="space-y-2">
          <h2 className="font-heading text-3xl text-white tracking-wide">
            Workout Complete
          </h2>
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            {formatFeedbackHeaderDate()}
          </p>
        </header>

        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">
            What changed
          </h3>
          {!hadMatchingExercise ? (
            <p className="text-sm text-neutral-400">
              No previous data to compare yet. Keep logging to track progress.
            </p>
          ) : deltaLines.length === 0 ? null : (
            <div>
              {deltaLines.map((line) => (
                <div
                  key={line.key}
                  className="flex justify-between items-center py-2 border-b border-forge-border/50 text-sm"
                >
                  <span className={line.labelClass}>{line.text}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">
            AFT Impact
          </h3>
          {aftMsgs.length === 0 ? (
            <p className="text-sm text-neutral-400 leading-relaxed">
              {aftFallback}
            </p>
          ) : (
            <div className="space-y-3">
              {aftMsgs.map((msg, i) => (
                <p
                  key={i}
                  className="text-sm text-neutral-400 leading-relaxed"
                >
                  {msg}
                </p>
              ))}
            </div>
          )}
        </section>

        <section>
          {streak >= 2 ? (
            <p className="font-heading text-2xl text-forge-accent">
              {streak} day training streak 🔥
            </p>
          ) : streak === 1 ? (
            <p className="text-sm text-neutral-400">
              First session logged. Come back tomorrow to start a streak.
            </p>
          ) : null}
        </section>

        {logs.length >= 3 ? (
          <section className="border border-forge-accent/30 bg-forge-accent/5 p-4 space-y-2">
            <h3 className="font-heading text-lg text-white">
              You&apos;re building momentum.
            </h3>
            <p className="text-sm text-neutral-400">
              Pro members get an AI training plan built around their actual
              AFT weak events — not a generic program.
            </p>
            <Link
              href="/train"
              className="block w-full border-2 border-forge-accent bg-forge-accent px-8 py-3 text-center text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
            >
              Unlock Custom Plan — $7/mo
            </Link>
          </section>
        ) : null}

        <button
          type="button"
          onClick={leaveFeedback}
          className="border border-forge-border bg-forge-bg px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:border-forge-accent hover:text-forge-accent transition-colors w-full"
        >
          Back to Log
        </button>
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <div className="space-y-8 border border-forge-border bg-forge-panel p-6">
        <h2 className="font-heading text-xl text-white tracking-wide">
          {view === "edit" ? "Edit workout" : "Log workout"}
        </h2>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
            Date
          </label>
          <input
            type="date"
            className={inputClass}
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-forge-accent">
            Session notes
          </label>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            placeholder="How did the session feel?"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-heading text-lg text-white">Exercises</h3>
          {exerciseRows.map((row, index) => (
            <div
              key={index}
              className="space-y-3 border border-forge-border bg-forge-bg p-4"
            >
              <div className="flex justify-between gap-2">
                <span className="text-xs text-neutral-500 uppercase tracking-widest">
                  Exercise {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-neutral-400 hover:text-white text-lg leading-none px-1"
                  aria-label="Remove exercise"
                >
                  ×
                </button>
              </div>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Deadlift, Push-ups, 2-Mile Run"
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                    Sets
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    placeholder="—"
                    value={row.sets}
                    onChange={(e) => updateRow(index, { sets: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                    Reps
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    placeholder="—"
                    value={row.reps}
                    onChange={(e) => updateRow(index, { reps: e.target.value })}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                    Weight
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      className={inputClass}
                      placeholder="—"
                      value={row.weight}
                      onChange={(e) =>
                        updateRow(index, { weight: e.target.value })
                      }
                    />
                    <select
                      className={inputClass + " max-w-[5.5rem] shrink-0"}
                      value={row.unit}
                      onChange={(e) =>
                        updateRow(index, {
                          unit: e.target.value as "lbs" | "kg",
                        })
                      }
                    >
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                  Time
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. 16:45"
                  value={row.time}
                  onChange={(e) => updateRow(index, { time: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                    Distance
                  </label>
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    placeholder="—"
                    value={row.distance}
                    onChange={(e) =>
                      updateRow(index, { distance: e.target.value })
                    }
                  />
                </div>
                <select
                  className={inputClass + " w-full sm:w-auto max-w-[5.5rem]"}
                  value={row.distanceUnit}
                  onChange={(e) =>
                    updateRow(index, {
                      distanceUnit: e.target.value as "mi" | "km",
                    })
                  }
                >
                  <option value="mi">mi</option>
                  <option value="km">km</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                  Exercise notes
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={row.notes}
                  onChange={(e) => updateRow(index, { notes: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addExerciseRow}
          className="border border-forge-border bg-forge-bg px-4 py-2 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
        >
          Add Exercise
        </button>

        {formError ? (
          <p className="text-sm text-red-400">{formError}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveWorkout()}
            className="border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
          >
            Save Workout
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={cancelForm}
            className="border border-forge-border bg-forge-bg px-8 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-300 hover:border-forge-accent hover:text-forge-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={openAddToday}
        className="border-2 border-forge-accent bg-forge-accent px-8 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
      >
        Log Today&apos;s Workout
      </button>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No workouts logged yet. Hit the button above to start.
        </p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => {
            const exCount = Array.isArray(log.exercises) ? log.exercises.length : 0;
            const preview = (log.notes ?? "").slice(0, 60);
            const more = (log.notes ?? "").length > 60 ? "…" : "";
            return (
              <li
                key={log.id}
                className="border border-forge-border bg-forge-panel p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-heading text-lg text-white">
                    {formatListDate(log.log_date)}
                  </p>
                  <p className="text-xs text-neutral-500 uppercase tracking-widest">
                    {exCount} exercise{exCount === 1 ? "" : "s"}
                  </p>
                  {preview || more ? (
                    <p className="text-sm text-neutral-400 break-words">
                      {preview}
                      {more}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(log)}
                    className="border border-forge-border bg-forge-bg px-3 py-2 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteLog(log.id)}
                    className="border border-forge-border bg-forge-bg px-3 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
