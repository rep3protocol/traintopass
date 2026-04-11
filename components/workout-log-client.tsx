"use client";

import { useCallback, useEffect, useState } from "react";

type WorkoutLogEntry = {
  id: string;
  log_date: string;
  notes: string;
  exercises: unknown[];
  created_at: string;
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

const inputClass =
  "w-full border border-forge-border bg-forge-bg px-3 py-2 text-sm text-white outline-none focus:border-forge-accent";

type Props = {
  userId: string;
};

export function WorkoutLogClient({ userId }: Props) {
  const [logs, setLogs] = useState<WorkoutLogEntry[]>([]);
  const [view, setView] = useState<"list" | "add" | "edit">("list");
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
      await fetchLogs();
      cancelForm();
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
