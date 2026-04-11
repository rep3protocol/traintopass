import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { EVENT_ORDER, type EventKey } from "@/lib/aft-scoring";
import { auth } from "@/auth";
import { AtRiskActions } from "@/components/groups/at-risk-actions";
import { ReadinessParticipationPanel } from "@/components/groups/readiness-participation-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  AFT_COMBAT_PASS,
  AFT_GENERAL_PASS,
  loadCompanyReadiness,
  type AtRiskRosterRow,
  type ReadinessMemberRow,
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

function atRiskLevelClass(kind: AtRiskRosterRow["kind"]): string {
  if (kind === "failed_last_test") return "text-red-400";
  if (kind === "declining_performance") return "text-orange-400";
  return "text-amber-400";
}

const SHORT_EVENT_LABEL: Record<EventKey, string> = {
  mdl: "MDL",
  hrp: "HRP",
  sdc: "SDC",
  plk: "PLK",
  twoMR: "2MR",
};

function snapshotStatus(
  readinessPct: number | null
): { word: string; wordClass: string } {
  if (readinessPct == null) {
    return { word: "—", wordClass: "text-neutral-400" };
  }
  if (readinessPct >= 90) {
    return { word: "GREEN", wordClass: "text-emerald-400" };
  }
  if (readinessPct >= 75) {
    return { word: "AMBER", wordClass: "text-amber-400" };
  }
  return { word: "RED", wordClass: "text-red-400" };
}

function heatmapCellClass(avg: number): string {
  if (avg >= 85) return "text-emerald-400 bg-emerald-500/10";
  if (avg >= 70) return "text-amber-400 bg-amber-500/10";
  return "text-red-400 bg-red-500/10";
}

function memberOverdue(m: ReadinessMemberRow): boolean {
  if (m.lastTestDate == null || m.daysSinceLastTest == null) return true;
  const limit = m.isNgOrReserve ? 365 : 180;
  return m.daysSinceLastTest > limit;
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

  const testedCount = data.members.filter((m) => m.lastTestDate != null).length;
  const overdueCount = data.members.filter(memberOverdue).length;
  const snap = snapshotStatus(data.readinessPct);

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

        <section className="border border-forge-border bg-forge-panel p-6 sm:p-8 space-y-5">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Commander Snapshot
          </h2>
          <div className="inline-flex flex-wrap items-baseline gap-3 rounded-lg border border-forge-border bg-forge-bg px-4 py-3">
            <span
              className={`font-heading text-2xl sm:text-3xl tracking-wide ${snap.wordClass}`}
            >
              {snap.word}
            </span>
            {data.readinessPct != null ? (
              <>
                <span className="text-neutral-500 font-heading">—</span>
                <span className="font-heading text-2xl sm:text-3xl text-white tabular-nums">
                  {Math.round(data.readinessPct)}%
                </span>
              </>
            ) : (
              <span className="text-sm text-neutral-500">No data</span>
            )}
          </div>
          <p className="text-sm text-neutral-400">
            {data.trend == null || data.trend === 0 ? (
              <span className="text-neutral-500">No change vs 30 days ago</span>
            ) : data.trend > 0 ? (
              <span className="text-emerald-400">
                + {data.trend.toFixed(1)}% vs 30 days ago
              </span>
            ) : (
              <span className="text-red-400">
                - {Math.abs(data.trend).toFixed(1)}% vs 30 days ago
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded border border-forge-border bg-forge-bg px-3 py-1.5 text-xs text-neutral-300">
              <span className="text-neutral-500 mr-1">Tested:</span>
              <span className="font-heading tabular-nums text-white">
                {testedCount} / {n}
              </span>
            </span>
            <span className="inline-flex rounded border border-forge-border bg-forge-bg px-3 py-1.5 text-xs text-neutral-300">
              <span className="text-neutral-500 mr-1">Passing:</span>
              <span className="font-heading tabular-nums text-white">
                {data.passingGeneral} / {n}
              </span>
            </span>
            <span className="inline-flex rounded border border-forge-border bg-forge-bg px-3 py-1.5 text-xs text-neutral-300">
              <span className="text-neutral-500 mr-1">At Risk:</span>
              <span className="font-heading tabular-nums text-white">
                {data.atRiskCount}
              </span>
            </span>
            <span className="inline-flex rounded border border-forge-border bg-forge-bg px-3 py-1.5 text-xs text-neutral-300">
              <span className="text-neutral-500 mr-1">Overdue:</span>
              <span className="font-heading tabular-nums text-white">
                {overdueCount}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
              Weakest: {data.weakestEvent.label} (
              <span className="font-heading tabular-nums">
                {Math.round(data.weakestEvent.avg)}
              </span>
              )
            </span>
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
              Strongest: {data.strongestEvent.label} (
              <span className="font-heading tabular-nums">
                {Math.round(data.strongestEvent.avg)}
              </span>
              )
            </span>
          </div>
        </section>

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
                    {Math.round(ev.avg).toString()}
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

        <section className="border border-forge-border bg-forge-panel p-6 space-y-5">
          <h2 className="font-heading text-xl text-white tracking-wide">
            Event Performance Heatmap
          </h2>
          <p className="text-xs text-neutral-500">
            Average event score by unit. Green ≥85, amber ≥70, red &lt;70.
          </p>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b border-forge-border text-[10px] uppercase tracking-widest text-neutral-500">
                  <th className="py-2 pr-4 font-normal border border-forge-border">
                    Unit
                  </th>
                  {EVENT_ORDER.map((k) => (
                    <th
                      key={k}
                      className="py-2 pr-4 font-normal text-right border border-forge-border"
                    >
                      {SHORT_EVENT_LABEL[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.platoonHeatmap.map((row, idx) => (
                  <tr
                    key={`${row.platoonName}-${idx}`}
                    className="border-b border-forge-border/80"
                  >
                    <td
                      className={`py-3 pr-4 text-neutral-200 whitespace-nowrap border border-forge-border ${idx === 0 ? "font-semibold" : ""}`}
                    >
                      {row.platoonName}
                    </td>
                    {EVENT_ORDER.map((k) => {
                      const v = row.eventAvgs[k] ?? 0;
                      return (
                        <td
                          key={k}
                          className={`py-3 pr-4 text-right font-heading tabular-nums text-sm border border-forge-border ${heatmapCellClass(v)}`}
                        >
                          {Math.round(v).toString()}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

        <section className="border border-forge-border bg-forge-panel p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-heading text-xl text-white tracking-wide">
              Automated AFT Risk Detection
            </h2>
            <p className="text-xs text-neutral-500 max-w-2xl">
              Flags from each member&apos;s latest recorded test (and test
              recency). Highest-severity flag is shown when several apply.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-widest text-neutral-400">
              At-risk roster
            </h3>
            {data.atRiskRoster.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No soldiers currently flagged. Unit is on track.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left text-sm border-collapse min-w-[1040px]">
                  <thead>
                    <tr className="border-b border-forge-border text-[10px] uppercase tracking-widest text-neutral-500">
                      <th className="py-2 pr-2 font-normal">Name</th>
                      <th className="py-2 pr-2 font-normal">
                        Military rank
                      </th>
                      <th className="py-2 pr-2 font-normal">Risk level</th>
                      <th className="py-2 pr-2 font-normal">Risk reason</th>
                      <th className="py-2 pr-2 font-normal">
                        Current score / required
                      </th>
                      <th className="py-2 pr-2 font-normal">Weak events</th>
                      <th className="py-2 pr-2 font-normal">Suggested action</th>
                      <th className="py-2 pl-2 font-normal">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.atRiskRoster.map((r) => (
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
                        <td
                          className={`py-3 pr-2 font-medium whitespace-nowrap ${atRiskLevelClass(r.kind)}`}
                        >
                          {r.riskLevel}
                        </td>
                        <td className="py-3 pr-2 text-xs text-neutral-300 max-w-[200px]">
                          {r.riskReason}
                        </td>
                        <td className="py-3 pr-2 font-heading tabular-nums text-white whitespace-nowrap">
                          {r.currentScoreRequiredDisplay}
                        </td>
                        <td className="py-3 pr-2 text-xs text-neutral-500 leading-snug max-w-[180px]">
                          {r.weakEvents.length > 0
                            ? r.weakEvents.join(" · ")
                            : "—"}
                        </td>
                        <td className="py-3 pr-2 text-xs text-neutral-500 leading-snug max-w-xs">
                          {r.suggestedAction}
                        </td>
                        <AtRiskActions userId={r.userId} groupId={groupId} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
