"use client";

import type { HistoryEntry } from "@/lib/history";

type Props = {
  history: HistoryEntry[];
  /** Show assessment index (1, 2, …) instead of calendar dates */
  labelMode?: "date" | "index";
};

/**
 * Line chart of total score over time (newest attempts may be unordered in storage).
 */
export function ProgressChart({ history, labelMode = "date" }: Props) {
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-neutral-500 leading-relaxed">
        Complete an assessment to start tracking your progress.
      </p>
    );
  }

  if (sorted.length < 2) {
    return (
      <p className="text-xs text-neutral-500 leading-relaxed">
        Complete another assessment to track your progress.
      </p>
    );
  }

  const W = 400;
  const H = 180;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = sorted.length;

  const pts = sorted.map((entry, i) => {
    const x = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const score = Math.min(500, Math.max(0, entry.totalScore));
    const y = padT + innerH - (score / 500) * innerH;
    return { x, y, entry };
  });

  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="border border-forge-border bg-[#0d0d0d] p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-56 text-forge-accent"
        role="img"
        aria-label="Total AFT score over past attempts"
      >
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          stroke="#2a2a2a"
          strokeWidth={1}
        />
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + innerH}
          stroke="#2a2a2a"
          strokeWidth={1}
        />
        <text x={4} y={padT + 4} fill="#737373" fontSize={9}>
          500
        </text>
        <text x={4} y={padT + innerH} fill="#737373" fontSize={9}>
          0
        </text>
        <path
          d={lineD}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p) => (
          <circle
            key={p.entry.historyId ?? p.entry.timestamp}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#0a0a0a"
            stroke="currentColor"
            strokeWidth={2}
          />
        ))}
        {pts.map((p, i) => (
          <text
            key={`l-${p.entry.historyId ?? p.entry.timestamp}`}
            x={p.x}
            y={H - 8}
            fill="#a3a3a3"
            fontSize={8}
            textAnchor="middle"
          >
            {labelMode === "index" ? String(i + 1) : p.entry.date}
          </text>
        ))}
      </svg>
    </div>
  );
}
