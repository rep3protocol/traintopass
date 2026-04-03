/**
 * Expects headings like "## Week 1" through "## Week 4" in the model output.
 */
export function parsePlanWeeks(fullText: string): {
  week1: string;
  week2: string;
  week3: string;
  week4: string;
} {
  const text = fullText.trim();

  const re = /##\s*Week\s*(\d+)\s*\n([\s\S]*?)(?=\n##\s*Week\s*\d|\s*$)/gi;
  const found = new Map<number, string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 4) {
      found.set(n, m[2].trim());
    }
  }

  if (found.size === 0) {
    return {
      week1: text,
      week2: "",
      week3: "",
      week4: "",
    };
  }

  return {
    week1: found.get(1) ?? "",
    week2: found.get(2) ?? "",
    week3: found.get(3) ?? "",
    week4: found.get(4) ?? "",
  };
}
