export type UnitType = "squad" | "platoon" | "company";

export const UNIT_TYPES: UnitType[] = ["squad", "platoon", "company"];

export function isUnitType(v: unknown): v is UnitType {
  return v === "squad" || v === "platoon" || v === "company";
}

export function maxMembersForUnitType(t: UnitType): number {
  switch (t) {
    case "squad":
      return 15;
    case "platoon":
      return 60;
    case "company":
      return 250;
    default:
      return 15;
  }
}

export function unitTypeLabel(t: UnitType): string {
  switch (t) {
    case "squad":
      return "Squad";
    case "platoon":
      return "Platoon";
    case "company":
      return "Company";
    default:
      return "Squad";
  }
}

export function parentUnitTypeFor(child: UnitType): UnitType | null {
  if (child === "platoon") return "company";
  if (child === "squad") return "platoon";
  return null;
}
