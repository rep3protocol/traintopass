"use client";

import { useCallback, useEffect, useState } from "react";

export function AccountNotificationSettings() {
  const [missedTraining, setMissedTraining] = useState(true);
  const [closeToPassing, setCloseToPassing] = useState(true);
  const [streak, setStreak] = useState(true);
  const [challenge, setChallenge] = useState(true);
  const [unit, setUnit] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/account/notifications");
        if (!res.ok) return;
        const j = (await res.json()) as {
          missed_training?: boolean;
          close_to_passing?: boolean;
          streak?: boolean;
          challenge?: boolean;
          unit?: boolean;
        };
        if (typeof j.missed_training === "boolean")
          setMissedTraining(j.missed_training);
        if (typeof j.close_to_passing === "boolean")
          setCloseToPassing(j.close_to_passing);
        if (typeof j.streak === "boolean") setStreak(j.streak);
        if (typeof j.challenge === "boolean") setChallenge(j.challenge);
        if (typeof j.unit === "boolean") setUnit(j.unit);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(
    async (patch: {
      missed_training?: boolean;
      close_to_passing?: boolean;
      streak?: boolean;
      challenge?: boolean;
      unit?: boolean;
    }) => {
      try {
        await fetch("/api/account/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      } catch {
        /* silent */
      }
    },
    []
  );

  if (loading) {
    return (
      <p className="text-xs text-neutral-600 uppercase tracking-widest">
        Loading notification settings…
      </p>
    );
  }

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
      <h2 className="font-heading text-xl text-white tracking-wide">
        Notifications
      </h2>
      <p className="text-sm text-neutral-500">
        Behavior-based reminders to keep you on track.
      </p>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-neutral-300">
          Remind me when I miss 2 days of training
        </span>
        <input
          type="checkbox"
          checked={missedTraining}
          onChange={(e) => {
            const v = e.target.checked;
            setMissedTraining(v);
            void save({ missed_training: v });
          }}
          className="h-4 w-4 accent-forge-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-neutral-300">
          Remind me when I&apos;m close to passing
        </span>
        <input
          type="checkbox"
          checked={closeToPassing}
          onChange={(e) => {
            const v = e.target.checked;
            setCloseToPassing(v);
            void save({ close_to_passing: v });
          }}
          className="h-4 w-4 accent-forge-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-neutral-300">Daily challenge alerts</span>
        <input
          type="checkbox"
          checked={challenge}
          onChange={(e) => {
            const v = e.target.checked;
            setChallenge(v);
            void save({ challenge: v });
          }}
          className="h-4 w-4 accent-forge-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-neutral-300">Streak reminders</span>
        <input
          type="checkbox"
          checked={streak}
          onChange={(e) => {
            const v = e.target.checked;
            setStreak(v);
            void save({ streak: v });
          }}
          className="h-4 w-4 accent-forge-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-neutral-300">Unit announcements</span>
        <input
          type="checkbox"
          checked={unit}
          onChange={(e) => {
            const v = e.target.checked;
            setUnit(v);
            void save({ unit: v });
          }}
          className="h-4 w-4 accent-forge-accent"
        />
      </label>
    </section>
  );
}
