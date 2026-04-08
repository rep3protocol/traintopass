import Link from "next/link";
import { unitTypeLabel, type UnitType } from "@/lib/unit-types";

export type SubUnitRow = {
  id: string;
  name: string;
  unitType: UnitType;
  averageScore: number;
};

type Props = {
  title: string;
  units: SubUnitRow[];
  /** Quick action to create a child unit (company → platoon, platoon → squad). */
  addHref?: string;
  addLabel?: string;
};

export function UnitSubUnits({ title, units, addHref, addLabel }: Props) {
  const addButton =
    addHref && addLabel ? (
      <Link
        href={addHref}
        className="inline-flex items-center border border-forge-accent px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:bg-forge-accent hover:text-forge-bg transition-colors shrink-0"
      >
        {addLabel}
      </Link>
    ) : null;

  if (units.length === 0) {
    return (
      <section className="border border-forge-border bg-forge-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-heading text-lg text-white tracking-wide">{title}</h2>
          {addButton}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          No sub-units linked yet. Create squads or platoons under this unit from
          Create unit, or invite members with join codes.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-heading text-lg text-white tracking-wide">{title}</h2>
        {addButton}
      </div>
      <ul className="divide-y divide-forge-border">
        {units.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
          >
            <div>
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 border border-forge-border px-2 py-0.5 mr-2">
                {unitTypeLabel(u.unitType)}
              </span>
              <span className="font-heading text-lg text-white">{u.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-500">
                Avg score:{" "}
                <span className="text-forge-accent font-heading text-base tabular-nums">
                  {Math.round(u.averageScore)}
                </span>
              </span>
              <Link
                href={`/groups/${u.id}`}
                className="text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:underline"
              >
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
