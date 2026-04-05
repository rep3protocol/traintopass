"use client";

type Point = { date: string; avg: number };

type Props = {
  points: Point[];
};

/**
 * Line chart of squad average total score by assessment date (same layout as progress tracker).
 */
export function GroupAverageChart({ points }: Props) {
  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-neutral-500 leading-relaxed">
        No squad assessment history yet. Complete AFT runs to chart unit averages.
      </p>
    );
  }

  if (sorted.length < 2) {
    return (
      <p className="text-xs text-neutral-500 leading-relaxed">
        Add more assessment days to chart unit improvement over time.
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

  const pts = sorted.map((p, i) => {
    const x = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const score = Math.min(500, Math.max(0, p.avg));
    const y = padT + innerH - (score / 500) * innerH;
    return { x, y, p };
  });

  const lineD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const label = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="border border-forge-border bg-[#0d0d0d] p-4">
      <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
        Unit average score over time
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-56 text-forge-accent"
        role="img"
        aria-label="Average unit AFT total score by date"
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
            key={p.p.date}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#0a0a0a"
            stroke="currentColor"
            strokeWidth={2}
          />
        ))}
        {pts.map((p) => (
          <text
            key={`l-${p.p.date}`}
            x={p.x}
            y={H - 8}
            fill="#a3a3a3"
            fontSize={8}
            textAnchor="middle"
          >
            {label(p.p.date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
