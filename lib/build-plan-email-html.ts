import { EVENT_ORDER } from "@/lib/aft-scoring";
import { escapeHtml } from "@/lib/html-escape";
import type { AnalyzeResponseBody } from "@/lib/analyze-types";

function deepDivesForEmail(data: AnalyzeResponseBody) {
  const dives = data.eventDeepDives ?? [];
  return dives
    .map((dive) => {
      const ev = data.events.find((e) => e.label === dive.event.trim());
      if (!ev || ev.score >= 75) return "";
      const drills = dive.drills
        .slice(0, 5)
        .map(
          (line) =>
            `<li style="margin:6px 0;color:#d4d4d4;">${escapeHtml(line)}</li>`
        )
        .join("");
      return `<div style="margin:20px 0;padding:16px;border:1px solid #333;background:#161616;">
        <h3 style="color:#4ade80;font-size:16px;margin:0 0 8px;">${escapeHtml(ev.label)}</h3>
        <p style="color:#a3a3a3;font-size:13px;margin:0 0 10px;">${ev.score} pts · ${escapeHtml(ev.status)}</p>
        <p style="color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Drills</p>
        <ol style="margin:0;padding-left:18px;">${drills}</ol>
        <p style="margin:14px 0 0;font-size:13px;color:#e5e5e5;"><strong style="color:#4ade80;">Common mistake:</strong> ${escapeHtml(dive.mistake)}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#e5e5e5;"><strong style="color:#4ade80;">Test day tip:</strong> ${escapeHtml(dive.tip)}</p>
      </div>`;
    })
    .join("");
}

function genderLabel(g: AnalyzeResponseBody["gender"] | undefined): string {
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  return "—";
}

function formatRawForEmail(
  key: AnalyzeResponseBody["events"][number]["key"],
  raw: number
): string {
  const isTimed = key === "sdc" || key === "plk" || key === "twoMR";
  if (isTimed) {
    const m = Math.floor(raw / 60);
    const s = Math.round(raw % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return String(raw);
}

export function buildFullPlanEmailHtml(data: AnalyzeResponseBody): string {
  const rows = EVENT_ORDER.map((k) => {
    const ev = data.events.find((e) => e.key === k);
    if (!ev) return "";
    return `<tr>
      <td style="padding:8px;border:1px solid #333;">${escapeHtml(ev.label)}</td>
      <td style="padding:8px;border:1px solid #333;">${escapeHtml(formatRawForEmail(ev.key, ev.raw))}</td>
      <td style="padding:8px;border:1px solid #333;">${ev.score}</td>
      <td style="padding:8px;border:1px solid #333;">${escapeHtml(ev.status)}</td>
    </tr>`;
  }).join("");

  const weeks = [
    { title: "Week 1", body: data.weeks.week1 },
    { title: "Week 2", body: data.weeks.week2 },
    { title: "Week 3", body: data.weeks.week3 },
    { title: "Week 4", body: data.weeks.week4 },
  ]
    .map(
      (w) =>
        `<h2 style="font-family:Georgia,serif;font-size:18px;color:#4ade80;margin:24px 0 8px;">${escapeHtml(w.title)}</h2>
        <pre style="font-family:system-ui,sans-serif;font-size:14px;color:#e5e5e5;white-space:pre-wrap;margin:0;">${escapeHtml(w.body)}</pre>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:24px;">
  <div style="max-width:640px;margin:0 auto;">
    <h1 style="font-size:22px;color:#fff;">Your 4-week AFT training plan</h1>
    <p style="color:#a3a3a3;font-size:14px;">
      Age group: <strong>${escapeHtml(data.ageGroup ?? "—")}</strong> · Gender: <strong>${escapeHtml(genderLabel(data.gender))}</strong><br />
      Total score: <strong>${data.totalScore}</strong> / 500 · Overall: <strong>${data.overallPassed ? "Pass" : "Fail"}</strong>
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <thead>
        <tr style="background:#161616;">
          <th style="padding:8px;border:1px solid #333;text-align:left;">Event</th>
          <th style="padding:8px;border:1px solid #333;">Raw</th>
          <th style="padding:8px;border:1px solid #333;">Pts</th>
          <th style="padding:8px;border:1px solid #333;">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${weeks}
    ${
      data.eventDeepDives?.length
        ? `<h2 style="font-family:Georgia,serif;font-size:18px;color:#4ade80;margin:28px 0 8px;">Event deep-dives (under 75 pts)</h2>
    ${deepDivesForEmail(data)}`
        : ""
    }
    <p style="margin-top:32px;font-size:12px;color:#737373;border-top:1px solid #333;padding-top:16px;">
      Train to Pass — traintopass.com
    </p>
  </div>
</body></html>`;
}

export function buildFreeResultsEmailHtml(data: AnalyzeResponseBody): string {
  const rows = EVENT_ORDER.map((k) => {
    const ev = data.events.find((e) => e.key === k);
    if (!ev) return "";
    return `<tr>
      <td style="padding:8px;border:1px solid #333;">${escapeHtml(ev.label)}</td>
      <td style="padding:8px;border:1px solid #333;">${ev.score}</td>
      <td style="padding:8px;border:1px solid #333;">${escapeHtml(ev.status)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    <h1 style="font-size:20px;color:#fff;">Your AFT score breakdown</h1>
    <p style="color:#a3a3a3;font-size:14px;">
      Age group: <strong>${escapeHtml(data.ageGroup ?? "—")}</strong> · Gender: <strong>${escapeHtml(genderLabel(data.gender))}</strong><br />
      Total: <strong>${data.totalScore}</strong> / 500 · <strong>${data.overallPassed ? "Overall pass" : "Overall fail"}</strong>
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <thead><tr style="background:#161616;">
        <th style="padding:8px;border:1px solid #333;text-align:left;">Event</th>
        <th style="padding:8px;border:1px solid #333;">Points</th>
        <th style="padding:8px;border:1px solid #333;">Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:24px;font-size:12px;color:#737373;">Train to Pass — traintopass.com</p>
  </div>
</body></html>`;
}
