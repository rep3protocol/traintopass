/**
 * Splits 12-week enlistment markdown into three phases (4 weeks each).
 * Expects headings like "## Phase 1" / "## Phase 2" / "## Phase 3" in model output.
 */
export function parseEnlistmentPhases(fullText: string): {
  phase1: string;
  phase2: string;
  phase3: string;
} {
  const text = fullText.trim();
  const re =
    /##\s*Phase\s*([123])[^\n]*\n([\s\S]*?)(?=\n##\s*Phase\s*[123]|\s*$)/gi;
  const found = new Map<number, string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 3) {
      found.set(n, m[2].trim());
    }
  }

  if (found.size === 0) {
    const third = Math.max(1, Math.floor(text.length / 3));
    return {
      phase1: text.slice(0, third).trim(),
      phase2: text.slice(third, third * 2).trim(),
      phase3: text.slice(third * 2).trim(),
    };
  }

  return {
    phase1: found.get(1) ?? "",
    phase2: found.get(2) ?? "",
    phase3: found.get(3) ?? "",
  };
}
