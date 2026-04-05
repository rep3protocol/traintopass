"use client";

import type { PatchKey } from "@/lib/patches";
import { PATCHES } from "@/lib/patches";

type BadgeSize = "small" | "large";

type PatchBadgeProps = {
  patchKey: PatchKey;
  earned: boolean;
  size?: BadgeSize;
};

export function PatchBadge({
  patchKey,
  earned,
  size = "small",
}: PatchBadgeProps) {
  const p = PATCHES[patchKey];
  const borderColor = earned ? p.color : "#525252";
  const base =
    "relative inline-flex items-center border bg-[#161616] text-left transition-opacity";
  const shape = size === "small" ? "px-2.5 py-1 gap-1.5" : "p-4 gap-3 flex-col sm:flex-row sm:items-start";
  const opacity = earned ? "opacity-100" : "opacity-30";

  return (
    <div
      className={`${base} ${shape} ${opacity}`}
      style={{
        borderColor,
        borderWidth: 1,
        borderRadius: 0,
      }}
    >
      {!earned ? (
        <span
          className="absolute inset-0 flex items-center justify-center text-lg sm:text-2xl pointer-events-none"
          aria-hidden
        >
          🔒
        </span>
      ) : null}
      <span className="text-lg sm:text-xl shrink-0">{p.emoji}</span>
      <div className="min-w-0">
        <p
          className={
            size === "small"
              ? "text-[11px] font-semibold uppercase tracking-wider text-neutral-200 leading-tight"
              : "font-heading text-lg text-white tracking-wide"
          }
        >
          {p.name}
        </p>
        {size === "large" ? (
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed max-w-[16rem]">
            {p.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type PatchGridProps = {
  earnedKeys: PatchKey[];
};

export function PatchGrid({ earnedKeys }: PatchGridProps) {
  const earned = new Set(earnedKeys);
  const keys = Object.keys(PATCHES) as PatchKey[];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {keys.map((k) => (
        <PatchBadge key={k} patchKey={k} earned={earned.has(k)} size="large" />
      ))}
    </div>
  );
}
