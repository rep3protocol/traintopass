/**
 * URL slug for public profile: lowercase, non-alphanumeric → hyphens, trimmed.
 */
export function slugifyProfileName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "user";
}
