import type { EventDeepDive } from "@/lib/analyze-types";

function isDeepDiveRecord(x: unknown): x is EventDeepDive {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.event !== "string" || !o.event.trim()) return false;
  if (!Array.isArray(o.drills) || o.drills.length < 1) return false;
  if (!o.drills.every((d) => typeof d === "string" && d.trim() !== ""))
    return false;
  if (typeof o.mistake !== "string" || !o.mistake.trim()) return false;
  if (typeof o.tip !== "string" || !o.tip.trim()) return false;
  return true;
}

function parseDivesJson(inner: string): EventDeepDive[] {
  try {
    const parsed = JSON.parse(inner.trim()) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { eventDeepDives?: unknown }).eventDeepDives)
    ) {
      const raw = (parsed as { eventDeepDives: unknown[] }).eventDeepDives;
      return raw.filter(isDeepDiveRecord);
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Find index of closing `}` that balances the first `{`, respecting JSON strings. */
function findBalancedBraceEnd(s: string): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (c === "\\") {
        esc = true;
      } else if (c === '"') {
        inStr = false;
      }
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function collectDivesFromFences(text: string): EventDeepDive[] {
  const dives: EventDeepDive[] = [];
  const re = /```\s*json\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    dives.push(...parseDivesJson(m[1]));
  }
  return dives;
}

/**
 * If the model opens ```json but omits the closing fence, remove from that opener through the
 * balanced JSON object and any trailing ```.
 */
function stripUnclosedJsonFence(text: string): string {
  const lower = text.toLowerCase();
  const tag = "```json";
  const idx = lower.lastIndexOf(tag);
  if (idx === -1) return text;

  const afterTag = text.slice(idx + tag.length);
  const rest = afterTag.replace(/^\s*/, "");
  const leadingWs = afterTag.length - rest.length;
  const braceAt = rest.indexOf("{");
  if (braceAt === -1) {
    return text.slice(0, idx).trimEnd();
  }
  const fromBrace = rest.slice(braceAt);
  const endRel = findBalancedBraceEnd(fromBrace);
  if (endRel === -1) {
    return text.slice(0, idx).trimEnd();
  }

  const absAfterObj =
    idx + tag.length + leadingWs + braceAt + endRel + 1;
  const tail = text.slice(absAfterObj);
  const closeFence = tail.match(/^\s*\n?\s*```/);
  const skip = closeFence ? closeFence[0].length : 0;
  return (text.slice(0, idx) + text.slice(absAfterObj + skip)).trimEnd();
}

/**
 * Remove a trailing raw `{"eventDeepDives":...}` if the model skipped fences entirely.
 */
function stripBareTrailingDeepDiveObject(text: string): string {
  const marker = '"eventDeepDives"';
  const idx = text.lastIndexOf(marker);
  if (idx === -1) return text;
  const braceStart = text.lastIndexOf("{", idx);
  if (braceStart === -1) return text;
  const slice = text.slice(braceStart);
  const endRel = findBalancedBraceEnd(slice);
  if (endRel === -1) return text;
  const candidate = slice.slice(0, endRel + 1);
  try {
    const p = JSON.parse(candidate) as { eventDeepDives?: unknown };
    if (p && Array.isArray(p.eventDeepDives)) {
      return text.slice(0, braceStart).trimEnd();
    }
  } catch {
    /* ignore */
  }
  return text;
}

/**
 * Removes deep-dive JSON artifacts from plan markdown so the UI never shows them.
 * Safe to run on the client for cached API responses.
 */
export function sanitizePlanBodyForDisplay(text: string): string {
  let t = text.replace(/\r\n/g, "\n");
  t = t.replace(/```\s*json\s*([\s\S]*?)```/gi, "");
  let prev = "";
  while (prev !== t) {
    prev = t;
    t = stripUnclosedJsonFence(t);
  }
  t = stripBareTrailingDeepDiveObject(t);
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

function collectDivesFromUnclosedOrBare(text: string): EventDeepDive[] {
  const lower = text.toLowerCase();
  const tag = "```json";
  const idx = lower.lastIndexOf(tag);
  if (idx !== -1) {
    const afterTag = text.slice(idx + tag.length).replace(/^\s*/, "");
    const braceAt = afterTag.indexOf("{");
    if (braceAt !== -1) {
      const fromBrace = afterTag.slice(braceAt);
      const endRel = findBalancedBraceEnd(fromBrace);
      if (endRel !== -1) {
        const parsed = parseDivesJson(fromBrace.slice(0, endRel + 1));
        if (parsed.length) return parsed;
      }
    }
  }
  const marker = '"eventDeepDives"';
  const mIdx = text.lastIndexOf(marker);
  if (mIdx === -1) return [];
  const braceStart = text.lastIndexOf("{", mIdx);
  if (braceStart === -1) return [];
  const slice = text.slice(braceStart);
  const endRel = findBalancedBraceEnd(slice);
  if (endRel === -1) return [];
  return parseDivesJson(slice.slice(0, endRel + 1));
}

/**
 * Strips the trailing ```json ... ``` block (and variants) from model output and parses eventDeepDives.
 */
export function extractPlanTextAndDeepDives(fullText: string): {
  planText: string;
  eventDeepDives: EventDeepDive[];
} {
  const text = fullText.trim();
  let dives = collectDivesFromFences(text);
  if (dives.length === 0) {
    dives = collectDivesFromUnclosedOrBare(text);
  }
  const planText = sanitizePlanBodyForDisplay(text);
  return { planText, eventDeepDives: dives };
}
