import { neon } from "@neondatabase/serverless";

export function getNeonSql(): ReturnType<typeof neon> | null {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === "") return null;
  return neon(url);
}
