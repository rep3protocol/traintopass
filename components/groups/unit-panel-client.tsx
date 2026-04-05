"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AnnouncementItem = {
  id: string;
  message: string;
  createdAt: string;
};

type Props = {
  groupId: string;
  isLeader: boolean;
  groupName: string;
  joinCode: string | null;
  memberCount: number;
  aftTestDate: string | null;
  weeklyChallengeScore: number | null;
  challengeHits: number;
  initialAnnouncements: AnnouncementItem[];
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return `${date} ${time} UTC`;
}

/** Keep <input type="date" /> value prop valid (YYYY-MM-DD only). */
function normalizeDateInputValue(s: string | null | undefined): string {
  if (!s) return "";
  const t = s.trim();
  const candidate = t.length >= 10 ? t.slice(0, 10) : t;
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

/** Ignore corrupt server values (e.g. non-ISO text); only strict YYYY-MM-DD is shown. */
function toValidAftYyyyMmDd(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  const candidate = t.length >= 10 ? t.slice(0, 10) : t;
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function daysUntilAft(dateStr: string | null): number | null {
  if (dateStr == null) return null;
  const normalized = String(dateStr).trim().slice(0, 10);
  if (!normalized || !normalized.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.log("[daysUntilAft]", {
      input: dateStr,
      parsedDate: null,
      today: new Date(),
      days: null,
    });
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(normalized + "T00:00:00");
  target.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  console.log("[daysUntilAft]", {
    input: dateStr,
    parsedDate: target,
    today,
    days: diff,
  });
  return diff;
}

/** e.g. "April 26, 2026" — local calendar day from YYYY-MM-DD */
function formatAftDisplayLong(iso: string): string {
  const s = iso.trim().slice(0, 10);
  const d = new Date(s + "T12:00:00");
  if (Number.isNaN(d.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return iso.trim();
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function aftCountdownClass(daysLeft: number): string {
  if (daysLeft < 0) return "text-neutral-400";
  if (daysLeft < 14) return "text-[#facc15]";
  return "text-green-500";
}

export function UnitPanelClient({
  groupId,
  isLeader,
  groupName,
  joinCode,
  memberCount,
  aftTestDate: initialAft,
  weeklyChallengeScore: initialChallenge,
  challengeHits: initialHits,
  initialAnnouncements,
}: Props) {
  const router = useRouter();
  const safeInitialAft = toValidAftYyyyMmDd(initialAft);
  const [aftTestDate, setAftTestDateState] = useState(safeInitialAft);
  const [weeklyChallengeScore, setWeeklyChallengeScoreState] = useState(
    initialChallenge
  );
  const [challengeHits, setChallengeHits] = useState(initialHits);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const aftDateInputRef = useRef<HTMLInputElement>(null);
  const testDateSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [testDateInput, setTestDateInput] = useState(() =>
    normalizeDateInputValue(safeInitialAft)
  );
  const [testDateSaveSuccess, setTestDateSaveSuccess] = useState(false);
  const [challengeInput, setChallengeInput] = useState(
    initialChallenge != null ? String(initialChallenge) : ""
  );
  const [announceInput, setAnnounceInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync server aft date only when switching units; including initialAft would reset after save on parent refresh.
  useEffect(() => {
    const next = toValidAftYyyyMmDd(initialAft);
    setAftTestDateState(next);
    setTestDateInput(normalizeDateInputValue(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    return () => {
      if (testDateSuccessTimerRef.current != null) {
        clearTimeout(testDateSuccessTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setWeeklyChallengeScoreState(initialChallenge);
    setChallengeInput(
      initialChallenge != null ? String(initialChallenge) : ""
    );
  }, [initialChallenge]);

  useEffect(() => {
    setChallengeHits(initialHits);
  }, [initialHits]);

  useEffect(() => {
    setAnnouncements(initialAnnouncements);
  }, [initialAnnouncements]);

  const daysLeft = useMemo(() => daysUntilAft(aftTestDate), [aftTestDate]);
  const hasAftDate = Boolean(
    aftTestDate != null && String(aftTestDate).trim().length > 0
  );

  const copyCode = useCallback(async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  }, [joinCode]);

  const saveTestDate = async () => {
    setBusy("date");
    const testDate = (aftDateInputRef.current?.value ?? "").trim();
    try {
      const res = await fetch(
        `/api/groups/${encodeURIComponent(groupId)}/test-date`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testDate }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        group?: { aftTestDate?: string | null };
        error?: string;
      };
      console.log("[UnitPanel] saveTestDate full API response data", data);
      console.log(
        "[UnitPanel] saveTestDate data.group / data.group.aftTestDate",
        data.group,
        data.group?.aftTestDate
      );
      if (res.ok && data.group) {
        const aft = data.group.aftTestDate;
        console.log(
          "[UnitPanel] saveTestDate value passed to setAftTestDateState",
          aft
        );
        if (aft != null && typeof aft === "string") {
          const next = aft.trim().slice(0, 10);
          setAftTestDateState(next);
          setTestDateInput(next);
          console.log(
            "[UnitPanel] saveTestDate state set to aftTestDate",
            next
          );
        }
        if (testDateSuccessTimerRef.current != null) {
          clearTimeout(testDateSuccessTimerRef.current);
        }
        setTestDateSaveSuccess(true);
        testDateSuccessTimerRef.current = setTimeout(() => {
          setTestDateSaveSuccess(false);
          testDateSuccessTimerRef.current = null;
        }, 2000);
      } else {
        console.error("[UnitPanel] save test date failed", {
          status: res.status,
          error: data.error,
          groupId,
          testDate,
        });
      }
    } catch (e) {
      console.error("[UnitPanel] save test date request error", {
        groupId,
        testDate,
        error: e,
      });
    } finally {
      setBusy(null);
    }
  };

  const saveChallenge = async () => {
    setBusy("challenge");
    try {
      const target = Number(challengeInput);
      const res = await fetch(`/api/groups/${groupId}/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetScore: target }),
      });
      const data = (await res.json()) as {
        group?: { weeklyChallengeScore?: number | null };
      };
      if (res.ok && data.group?.weeklyChallengeScore != null) {
        setWeeklyChallengeScoreState(data.group.weeklyChallengeScore);
        setChallengeInput(String(data.group.weeklyChallengeScore));
        router.refresh();
      }
    } catch {
      /* silent */
    } finally {
      setBusy(null);
    }
  };

  const postAnnouncement = async () => {
    const msg = announceInput.trim();
    if (!msg || msg.length > 500) return;
    setBusy("announce");
    try {
      const res = await fetch(`/api/groups/${groupId}/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = (await res.json()) as {
        announcement?: AnnouncementItem;
      };
      if (res.ok && data.announcement) {
        const ann = data.announcement;
        setAnnouncements((prev) =>
          [
            {
              ...ann,
              createdAt: formatDateTime(ann.createdAt),
            },
            ...prev,
          ].slice(0, 5)
        );
        setAnnounceInput("");
        router.refresh();
      }
    } catch {
      /* silent */
    } finally {
      setBusy(null);
    }
  };

  const leave = async () => {
    if (!window.confirm("Leave this unit?")) return;
    setBusy("leave");
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "DELETE",
      });
      if (res.ok) router.push("/groups");
    } catch {
      /* silent */
    } finally {
      setBusy(null);
    }
  };

  const destroy = async () => {
    if (
      !window.confirm(
        "Delete this unit for everyone? This cannot be undone."
      )
    )
      return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (res.ok) router.push("/groups");
    } catch {
      /* silent */
    } finally {
      setBusy(null);
    }
  };

  const challengePct =
    memberCount > 0 && weeklyChallengeScore != null
      ? Math.min(100, Math.round((challengeHits / memberCount) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
        <h1 className="font-heading text-3xl sm:text-4xl text-white tracking-wide">
          {groupName}
        </h1>
        <p className="text-xs text-neutral-500 uppercase tracking-widest">
          Members {memberCount} / 20
        </p>

        {isLeader && joinCode ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">
              Join code
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-3xl sm:text-4xl tracking-widest text-forge-accent">
                {joinCode}
              </span>
              <button
                type="button"
                onClick={() => void copyCode()}
                className="border border-forge-border px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="border-t border-forge-border pt-4 space-y-2">
          <h2 className="font-heading text-lg text-white tracking-wide">
            AFT TEST DATE
          </h2>
          {hasAftDate ? (
            <div className="space-y-1">
              <p className="text-sm text-neutral-200">
                AFT Test Date:{" "}
                <span className="text-white font-medium">
                  {formatAftDisplayLong(String(aftTestDate))}
                </span>
              </p>
              <p
                className={`text-sm font-medium ${
                  daysLeft === null || !Number.isFinite(daysLeft)
                    ? "text-neutral-500"
                    : daysLeft < 0
                      ? "text-neutral-400"
                      : daysLeft === 0
                        ? "text-green-500"
                        : aftCountdownClass(daysLeft)
                }`}
              >
                {daysLeft === null || !Number.isFinite(daysLeft)
                  ? "Date set"
                  : daysLeft < 0
                    ? `AFT was ${Math.abs(daysLeft)} days ago`
                    : daysLeft === 0
                      ? "AFT is today!"
                      : `${daysLeft} days until your AFT`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              No test date set{isLeader ? ". Set one for the unit." : "."}
            </p>
          )}
          {isLeader ? (
            <div className="flex flex-wrap gap-2 items-end pt-2">
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
                ISO date
                <input
                  ref={aftDateInputRef}
                  type="date"
                  value={testDateInput}
                  onChange={(e) => setTestDateInput(e.target.value)}
                  className="bg-forge-bg border border-forge-border px-3 py-2 text-sm text-neutral-200"
                />
              </label>
              <button
                type="button"
                disabled={busy === "date"}
                onClick={() => void saveTestDate()}
                className="border border-forge-accent bg-forge-accent px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors disabled:opacity-50"
              >
                Save date
              </button>
              {testDateSaveSuccess ? (
                <p className="w-full text-sm text-green-500" role="status">
                  Test date saved!
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="border-t border-forge-border pt-4 space-y-2">
          <h2 className="font-heading text-lg text-white tracking-wide">
            WEEKLY CHALLENGE
          </h2>
          {weeklyChallengeScore != null ? (
            <>
              <p className="text-sm text-neutral-200">
                This week&apos;s target:{" "}
                <span className="text-forge-accent font-heading text-xl tabular-nums">
                  {weeklyChallengeScore}
                </span>
              </p>
              <p className="text-xs text-neutral-500">
                {challengeHits} of {memberCount} members at or above target
              </p>
              <div className="h-2 bg-forge-bg border border-forge-border">
                <div
                  className="h-full bg-forge-accent transition-[width] duration-300"
                  style={{ width: `${challengePct}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-neutral-500">
              No target set{isLeader ? ". Set a total score target." : "."}
            </p>
          )}
          {isLeader ? (
            <div className="flex flex-wrap gap-2 items-end pt-2">
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
                Target (0–500)
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={challengeInput}
                  onChange={(e) => setChallengeInput(e.target.value)}
                  className="bg-forge-bg border border-forge-border px-3 py-2 text-sm text-neutral-200 w-28"
                />
              </label>
              <button
                type="button"
                disabled={busy === "challenge"}
                onClick={() => void saveChallenge()}
                className="border border-forge-accent bg-forge-accent px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors disabled:opacity-50"
              >
                Save target
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
        <h2 className="font-heading text-lg text-white tracking-wide">
          ANNOUNCEMENTS
        </h2>
        <ul className="space-y-3">
          {announcements.length === 0 ? (
            <li className="text-xs text-neutral-500">No announcements yet.</li>
          ) : (
            announcements.map((a) => (
              <li
                key={a.id}
                className="border border-forge-border bg-[#0d0d0d] p-4 space-y-1"
              >
                <p className="text-[10px] text-neutral-600 uppercase tracking-wider">
                  {a.createdAt}
                </p>
                <p className="text-sm text-white whitespace-pre-wrap break-words">
                  {a.message}
                </p>
              </li>
            ))
          )}
        </ul>
        {isLeader ? (
          <div className="space-y-2 pt-2 border-t border-forge-border">
            <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
              New announcement (max 500 characters)
              <textarea
                value={announceInput}
                maxLength={500}
                rows={3}
                onChange={(e) => setAnnounceInput(e.target.value)}
                className="bg-forge-bg border border-forge-border px-3 py-2 text-sm text-white resize-y min-h-[80px]"
              />
            </label>
            <button
              type="button"
              disabled={busy === "announce" || !announceInput.trim()}
              onClick={() => void postAnnouncement()}
              className="border border-forge-border px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors disabled:opacity-50"
            >
              Post
            </button>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void leave()}
          className="border border-forge-border px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-300 hover:border-forge-accent hover:text-forge-accent transition-colors disabled:opacity-50"
        >
          Leave unit
        </button>
        {isLeader ? (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void destroy()}
            className="border border-red-900/80 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-red-400 hover:border-red-500 transition-colors disabled:opacity-50"
          >
            Delete unit
          </button>
        ) : null}
      </div>
    </div>
  );
}
