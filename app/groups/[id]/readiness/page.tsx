import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import { ReadinessParticipationPanel } from "@/components/groups/readiness-participation-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  AFT_COMBAT_PASS,
  AFT_GENERAL_PASS,
  loadCompanyReadiness,
  type ReadinessRiskRow,
} from "@/lib/company-readiness";
import { isUuidParam } from "@/lib/group-route-helpers";

function eventAvgColorClass(avg: number): string {
  if (avg >= 75) return "text-emerald-400";
  if (avg >= 60) return "text-amber-400";
  return "text-red-400";
}

function eventBarClass(avg: number): string {
  if (avg >= 75) return "bg-emerald-500/85";
  if (avg >= 60) return "bg-amber-500/85";
  return "bg-red-500/85";
}

function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(
    iso.includes("T") ? iso : `${iso}T12:00:00Z`
  );
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function riskHeading(kind: ReadinessRiskRow["kind"]): string {
  return kind === "combat_at_risk"
    ? "Combat MOS risk (300–349 pts)"
    : "Close to failing general (270–299 pts)";
}

function riskDescription(kind: ReadinessRiskRow["kind"]): string {
  return kind === "combat_at_risk"
    ? "Passing general standard; below combat MOS threshold."
    : "Within 30 points of the 300-point general minimum.";
}

type PageProps = { params: { id: string } };

export default async function CompanyReadinessPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const groupId = params.id;
  if (!isUuidParam(groupId)) notFound();

  const uid = session.user.id;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) notFound();

  let authorized = false;
  try {
    const sql = neon(url);
    const raw = await sql`
      SELECT 1 AS x
      FROM "groups" g
      WHERE g.id = ${groupId}::uuid
        AND g.leader_id = ${uid}::uuid
        AND g.unit_type::text = 'company'
      LIMIT 1
    `;
    authorized = (raw as { x: number }[]).length > 0;
  } catch {
    authorized = false;
  }

  if (!authorized) {
    redirect(`/groups/${groupId}`);
  }

  let data: Awaited<ReturnType<typeof loadCompanyReadiness>>;
  try {
    data = await loadCompanyReadiness(url, groupId);
  } catch {
    notFound();
  }

  const n = data.members.length;
  const pctDisplay =
    data.readinessPct != null ? Math.round(data.readinessPct) : null;
  const ngPct =
    data.ngTotal === 0
      ? null
      : Math.round((100 * data.ngCurrent) / data.ngTotal);
  const adPct =
    data.adTotal === 0
      ? null
      : Math.round((100 * data.adCurrent) / data.adTotal);

  const combatAtRisk = data.riskRows.filter((r) => r.kind === "combat_at_risk");
  const closeToFail = data.riskRows.filter((r) => r.kind === "close_to_fail");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-6xl mx-auto w-full space-y-10">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <Link
              href={`/groups/${encodeURIComponent(groupId)}`}
              className="text-forge-accent hover:underline"
            >
              ← Unit
            </Link>
            <span aria-hidden>·</span>
            <span className="text-[10px] uppercase tracking-widest">
              Readiness
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl text-white tracking-wide">
            {data.groupName}
          </h1>
          <p className="text-sm text-neutral-400 max-w-2xl">
            Company readiness from best recorded AFT per member (sub-units
            included). General pass is {AFT_GENERAL_PASS}+ total; combat MOS
            standard is {AFT_COMBAT_PASS}+.
          </p>
        </div>

        <section className="border border-forge-border bg-forge-panel p-6 sm:p-8 space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Overall readiness
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            <p className="font-heading text-5xl sm:text-6xl text-forge-accent tabular-nums leading-none">
              {pctDisplay != null ? `${pctDisplay}%` : "—"}
            </p>
            <div className="space-y-1 pb-1">
              <p className="text-lg text-neutral-100">
                {n === 0
                  ? "No members in subtree"
                  : `${data.passingGeneral}/${n} passing — ${pctDisplay ?? 0}% ready`}
              </p>
              <p className="text-xs text-neutral-500">
                General standard ({AFT_GENERAL_PASS}+ pts).{" "}
                <span className="text-neutral-400">
                  {data.passingCombat}/{n} at combat MOS bar ({AFT_COMBAT_PASS}
                  +).
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="border border-forge-border bg-forge-panel p-6 space-y-5">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Average score per event
          </h2>
          <p className="text-xs text-neutral-500">
            Mean of each member&apos;s best event score. Green ≥75, yellow
            ≥60, red &lt;60.
          </p>
          <ul className="space-y-4">
            {data.eventAverages.map((ev) => (
              <li key={ev.key} className="space-y-1.5">
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-neutral-300 font-medium">
                    {ev.label}
                  </span>
                  <span
                    className={`font-heading tabular-nums ${eventAvgColorClass(ev.avg)}`}
                  >
                    {ev.avg.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 rounded bg-forge-bg border border-forge-border overflow-hidden">
                  <div
                    className={`h-full rounded-sm transition-all ${eventBarClass(ev.avg)}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, ev.avg))}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <ReadinessParticipationPanel
          ngLabel="National Guard / Reserve"
          ngCurrent={data.ngCurrent}
          ngTotal={data.ngTotal}
          ngPct={ngPct}
          adLabel="Active Duty"
          adCurrent={data.adCurrent}
          adTotal={data.adTotal}
          adPct={adPct}
          stale365={data.stale365}
          stale180={data.stale180}
        />

        <section className="border border-forge-border bg-forge-panel p-6 space-y-6">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Risk flags
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-amber-400/90">
                {riskHeading("combat_at_risk")}
              </p>
              <p className="text-xs text-neutral-500">
                {riskDescription("combat_at_risk")}
              </p>
              {combatAtRisk.length === 0 ? (
                <p className="text-sm text-neutral-400">None</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {combatAtRisk.map((r) => (
                    <li
                      key={r.userId}
                      className="border-b border-forge-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-neutral-100 font-medium">
                        {r.name}
                      </span>
                      <span className="text-neutral-500 tabular-nums">
                        {" "}
                        · {Math.round(r.bestTotal)} pts
                      </span>
                      {r.weakEvents.length > 0 ? (
                        <p className="text-[11px] text-neutral-500 mt-1">
                          Weak: {r.weakEvents.join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded border border-red-500/25 bg-red-500/5 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-red-400/90">
                {riskHeading("close_to_fail")}
              </p>
              <p className="text-xs text-neutral-500">
                {riskDescription("close_to_fail")}
              </p>
              {closeToFail.length === 0 ? (
                <p className="text-sm text-neutral-400">None</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {closeToFail.map((r) => (
                    <li
                      key={r.userId}
                      className="border-b border-forge-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-neutral-100 font-medium">
                        {r.name}
                      </span>
                      <span className="text-neutral-500 tabular-nums">
                        {" "}
                        · {Math.round(r.bestTotal)} pts
                      </span>
                      {r.weakEvents.length > 0 ? (
                        <p className="text-[11px] text-neutral-500 mt-1">
                          Weak: {r.weakEvents.join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Member status
          </h2>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-forge-border text-[10px] uppercase tracking-widest text-neutral-500">
                  <th className="py-2 pr-2 font-normal">Name</th>
                  <th className="py-2 pr-2 font-normal">Rank</th>
                  <th className="py-2 pr-2 font-normal">Best</th>
                  <th className="py-2 pr-2 font-normal">Pass</th>
                  <th className="py-2 pr-2 font-normal">Last test</th>
                  <th className="py-2 pr-2 font-normal">Days</th>
                  <th className="py-2 font-normal">Weak events</th>
                </tr>
              </thead>
              <tbody>
                {data.members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-xs text-neutral-500"
                    >
                      No members in this company tree.
                    </td>
                  </tr>
                ) : (
                  data.members.map((r) => (
                    <tr
                      key={r.userId}
                      className="border-b border-forge-border/80 align-top"
                    >
                      <td className="py-3 pr-2 text-neutral-200 whitespace-nowrap">
                        {r.name}
                      </td>
                      <td className="py-3 pr-2 text-neutral-400 whitespace-nowrap">
                        {r.militaryRankDisplay}
                      </td>
                      <td className="py-3 pr-2 font-heading text-base text-white tabular-nums whitespace-nowrap">
                        {Math.round(r.bestTotal)}
                        <span className="text-[10px] text-neutral-500 font-body font-normal">
                          {" "}
                          / 500
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <span
                          className={
                            r.passGeneral
                              ? "text-emerald-400 uppercase text-[10px] tracking-wider"
                              : "text-red-400 uppercase text-[10px] tracking-wider"
                          }
                        >
                          {r.passGeneral ? "Pass" : "Fail"}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-xs text-neutral-500 whitespace-nowrap">
                        {formatTableDate(r.lastTestDate)}
                      </td>
                      <td className="py-3 pr-2 text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                        {r.daysSinceLastTest != null
                          ? r.daysSinceLastTest
                          : "—"}
                      </td>
                      <td className="py-3 text-xs text-neutral-500 leading-snug">
                        {r.weakEvents.length > 0
                          ? r.weakEvents.join(" · ")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
