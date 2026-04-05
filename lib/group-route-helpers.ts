const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidParam(id: string | undefined): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}
