import Image from "next/image";
import type { RankBadgeVariant } from "@/lib/ranks";
import { rankDisplayGrade, rankName } from "@/lib/ranks";

const SIZE_PX = { small: 32, medium: 48, large: 80 } as const;

type SizeKey = keyof typeof SIZE_PX;

const RANK_IMAGE_SRC: Record<Exclude<RankBadgeVariant, "E-1">, string> = {
  "E-2": "/ranks/e2.png",
  "E-3": "/ranks/e3.png",
  "E-4-SPC": "/ranks/e4-spc.png",
  "E-4-CPL": "/ranks/e4-cpl.png",
  "E-5": "/ranks/e5.png",
  "E-6": "/ranks/e6.png",
  "E-7": "/ranks/e7.png",
  "E-8-MSG": "/ranks/e8-msg.png",
  "E-8-1SG": "/ranks/e8-1sg.png",
  "E-9-SGM": "/ranks/e9-sgm.png",
  "E-9-CSM": "/ranks/e9-csm.png",
  "E-9-SMA": "/ranks/e9-sma.png",
};

export type RankBadgeProps = {
  rank: RankBadgeVariant;
  size?: SizeKey;
  showLabel?: boolean;
  className?: string;
  /** When true, insignia at 50% opacity with a lock overlay (e.g. future ranks). */
  locked?: boolean;
  /** When true, green ring around the badge (e.g. current rank on the ladder). */
  highlighted?: boolean;
};

export function RankBadge({
  rank,
  size = "medium",
  showLabel = false,
  className = "",
  locked = false,
  highlighted = false,
}: RankBadgeProps) {
  const px = SIZE_PX[size];
  const label = `${rankName(rank)} — ${rankDisplayGrade(rank)}`;
  const src = rank === "E-1" ? null : RANK_IMAGE_SRC[rank];

  return (
    <div
      className={`inline-flex flex-col items-center gap-1 ${className}`.trim()}
    >
      <div
        className="relative shrink-0"
        role={showLabel ? "img" : undefined}
        aria-label={showLabel ? label : undefined}
        aria-hidden={!showLabel}
      >
        <div
          className={`relative overflow-hidden rounded-md bg-forge-panel p-0 ${
            highlighted ? "ring-2 ring-forge-accent" : ""
          }`}
          style={{ width: px, height: px }}
        >
          {src ? (
            <Image
              src={src}
              alt={rankName(rank)}
              fill
              className={`object-contain p-0 origin-center scale-[1.28] ${
                locked ? "opacity-50" : "opacity-100"
              }`}
              sizes={`${px}px`}
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center rounded-md bg-forge-panel p-0 ${
                locked ? "opacity-50" : ""
              }`}
            >
              <span
                className="flex items-center justify-center rounded-full bg-neutral-500 font-semibold text-white"
                style={{
                  width: Math.max(12, Math.round(px * 0.62)),
                  height: Math.max(12, Math.round(px * 0.62)),
                  fontSize: Math.max(8, Math.round(px * 0.22)),
                }}
              >
                E-1
              </span>
            </div>
          )}
          {locked ? (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/35 text-base leading-none"
              aria-hidden
            >
              🔒
            </span>
          ) : null}
        </div>
      </div>
      {showLabel ? (
        <span className="text-[9px] sm:text-[10px] tracking-wide text-neutral-400 text-center max-w-[10rem] leading-tight">
          {rankName(rank)}
          <span className="text-neutral-600"> · </span>
          {rankDisplayGrade(rank)}
        </span>
      ) : null}
    </div>
  );
}

/** Representative badge per pay grade for marketing ladder (E-4 = Corporal, E-8 = MSG, E-9 = SGM). */
export const LADDER_REPRESENTATIVE_RANKS: RankBadgeVariant[] = [
  "E-1",
  "E-2",
  "E-3",
  "E-4-CPL",
  "E-5",
  "E-6",
  "E-7",
  "E-8-MSG",
  "E-9-SGM",
];

export const LADDER_LABELS: Record<string, string> = {
  "E-1": "Private",
  "E-2": "Private",
  "E-3": "Private First Class",
  "E-4-CPL": "Corporal / Specialist",
  "E-5": "Sergeant",
  "E-6": "Staff Sergeant",
  "E-7": "Sergeant First Class",
  "E-8-MSG": "Master Sergeant / First Sergeant",
  "E-9-SGM":
    "Sergeant Major / Command Sergeant Major / Sergeant Major of the Army",
};
