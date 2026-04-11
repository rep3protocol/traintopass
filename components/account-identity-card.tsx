import { formatMilitaryRankDisplay } from "@/lib/military-rank";

type Props = {
  name: string;
  email: string;
  militaryRank: string | null;
  unitName: string | null;
  paid: boolean;
  freeMonthsRemaining: number;
};

export function AccountIdentityCard({
  name,
  email,
  militaryRank,
  unitName,
  paid,
  freeMonthsRemaining,
}: Props) {
  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-3">
      <p className="font-heading text-2xl text-white">{name}</p>
      <p className="text-xs text-neutral-500">{email}</p>
      <p className="text-sm text-neutral-400">
        <span className="text-neutral-500">Rank:</span>{" "}
        {formatMilitaryRankDisplay(militaryRank)}
      </p>
      <p className="text-sm text-neutral-400">
        <span className="text-neutral-500">Unit:</span>{" "}
        {unitName?.trim() ? unitName.trim() : "—"}
      </p>
      <p>
        <span
          className={`text-[10px] uppercase tracking-widest ${
            paid ? "text-forge-accent" : "text-neutral-400"
          }`}
        >
          {paid ? "PRO" : "FREE"}
        </span>
      </p>
      {freeMonthsRemaining > 0 ? (
        <p className="text-xs text-neutral-500">
          {freeMonthsRemaining} free month
          {freeMonthsRemaining === 1 ? "" : "s"} remaining
        </p>
      ) : null}
    </section>
  );
}
