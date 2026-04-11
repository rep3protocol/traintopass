"use client";

import { useCallback, useEffect, useState } from "react";

const OPTIONS = [
  { id: "Knee pain" as const, label: "Knee pain" },
  { id: "Lower back pain" as const, label: "Lower back pain" },
  { id: "Shoulder pain" as const, label: "Shoulder pain" },
  { id: "None" as const, label: "None" },
];

type LimitationId = (typeof OPTIONS)[number]["id"];

export function AccountLimitations() {
  const [selected, setSelected] = useState<Set<LimitationId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/account/limitations");
        if (!res.ok) return;
        const j = (await res.json()) as { limitations?: string[] };
        const list = Array.isArray(j.limitations) ? j.limitations : [];
        const next = new Set<LimitationId>();
        for (const o of OPTIONS) {
          if (list.includes(o.id)) next.add(o.id);
        }
        setSelected(next);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: Set<LimitationId>) => {
    const body = { limitations: Array.from(next) };
    try {
      const res = await fetch("/api/account/limitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2000);
      }
    } catch {
      /* silent */
    }
  }, []);

  function toggle(id: LimitationId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (id === "None") {
        next.clear();
        next.add("None");
      } else {
        next.delete("None");
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      void persist(next);
      return next;
    });
  }

  if (loading) {
    return (
      <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
        <h2 className="font-heading text-xl text-white tracking-wide">
          Limitations
        </h2>
        <p className="text-xs text-neutral-600 uppercase tracking-widest">
          Loading…
        </p>
      </section>
    );
  }

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl text-white tracking-wide">
            Limitations
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Used to adjust your AI training plans.
          </p>
        </div>
        {savedFlash ? (
          <span className="text-xs text-forge-accent shrink-0">Saved</span>
        ) : null}
      </div>
      <div className="space-y-3">
        {OPTIONS.map((o) => (
          <label
            key={o.id}
            className="flex items-center justify-between gap-4 cursor-pointer"
          >
            <span className="text-sm text-neutral-300">{o.label}</span>
            <input
              type="checkbox"
              checked={selected.has(o.id)}
              onChange={() => toggle(o.id)}
              className="h-4 w-4 accent-forge-accent"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
