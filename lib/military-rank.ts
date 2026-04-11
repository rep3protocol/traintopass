/** Display in unit tables when military_rank is unset. */
export const MILITARY_RANK_EM_DASH = "—";

const ENLISTED = ["E-1", "E-2", "E-3", "E-4", "E-5", "E-6", "E-7", "E-8", "E-9"] as const;
const CADET = ["Cadet"] as const;
const WARRANT = ["W-1", "W-2", "W-3", "W-4", "W-5"] as const;
const OFFICER = [
  "O-1",
  "O-2",
  "O-3",
  "O-4",
  "O-5",
  "O-6",
  "O-7",
  "O-8",
  "O-9",
  "O-10",
] as const;

/** Legacy stored value; normalized to "Cadet" in UI. */
const CADET_LEGACY = "CDT" as const;

export const MILITARY_RANK_VALUES: readonly string[] = [
  ...ENLISTED,
  ...CADET,
  ...WARRANT,
  ...OFFICER,
];

const ALLOWED = new Set<string>([...MILITARY_RANK_VALUES, CADET_LEGACY]);

export function formatMilitaryRankDisplay(
  militaryRank: string | null | undefined
): string {
  const t = militaryRank == null ? "" : String(militaryRank).trim();
  if (t === "") return MILITARY_RANK_EM_DASH;
  if (t === CADET_LEGACY) return "Cadet";
  return t;
}

export function isAllowedMilitaryRank(value: string): boolean {
  return ALLOWED.has(value.trim());
}

export type MilitaryRankSelectGroup = {
  label: string;
  options: { value: string; label: string }[];
};

/** Optgroups only; add a leading empty-value "None / Civilian" option in the select. */
export const MILITARY_RANK_SELECT_GROUPS: MilitaryRankSelectGroup[] = [
  {
    label: "Enlisted",
    options: ENLISTED.map((v) => ({ value: v, label: v })),
  },
  {
    label: "Cadet",
    options: CADET.map((v) => ({ value: v, label: v })),
  },
  {
    label: "Warrant Officer",
    options: WARRANT.map((v) => ({ value: v, label: v })),
  },
  {
    label: "Officer",
    options: OFFICER.map((v) => ({ value: v, label: v })),
  },
];
