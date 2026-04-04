import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(req: Request) {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const sql = neon(url);
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(password, 12);

  try {
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    await sql`
      INSERT INTO users (name, email, password, "emailVerified", image)
      VALUES (${name || null}, ${email}, ${hash}, NULL, NULL)
    `;
  } catch {
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
