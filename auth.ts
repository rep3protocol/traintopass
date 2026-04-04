import NextAuth from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import { neon } from "@neondatabase/serverless";
import { Pool } from "@neondatabase/serverless";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

function getAuthSql() {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === "") return null;
  return neon(url);
}

const credentialProvider = Credentials({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email =
      typeof credentials?.email === "string"
        ? credentials.email.trim().toLowerCase()
        : "";
    const password =
      typeof credentials?.password === "string" ? credentials.password : "";
    console.log("[auth][credentials] authorize: email lookup", email, "hasPasswordInput", Boolean(password));
    if (!email || !password) {
      console.log("[auth][credentials] authorize: missing email or password");
      return null;
    }

    const sql = getAuthSql();
    if (!sql) {
      console.log("[auth][credentials] authorize: no sql client (DATABASE_URL missing?)");
      return null;
    }

    let rows: Record<string, unknown>[];
    try {
      rows = await sql`
        SELECT id, name, email, password, image
        FROM users
        WHERE email = ${email}
      `;
    } catch (err) {
      console.log("[auth][credentials] authorize: user query failed", err);
      return null;
    }

    const raw = rows[0];
    if (!raw) {
      console.log("[auth][credentials] authorize: no user row for email");
      return null;
    }

    const row = {
      id: String(raw.id ?? ""),
      name: (raw.name as string | null) ?? null,
      email: String(raw.email ?? ""),
      password: (raw.password as string | null) ?? null,
      image: (raw.image as string | null) ?? null,
    };

    const hashedPassword =
      typeof row.password === "string" ? row.password.trim() : "";
    console.log(
      "[auth][credentials] authorize: loaded user row, password field length",
      hashedPassword.length
    );
    if (!hashedPassword) {
      console.log("[auth][credentials] authorize: empty password hash on user");
      return null;
    }

    const { compare } = await import("bcryptjs");
    const ok = await compare(password, hashedPassword);
    console.log("[auth][credentials] authorize: bcrypt.compare result", ok);
    if (!ok) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
    };
  },
});

const googleProviders =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [];

const sharedCallbacks: NextAuthConfig["callbacks"] = {
  async session({ session, user }) {
    if (session.user) {
      session.user.id = user.id;
    }
    return session;
  },
};

const sharedEvents: NextAuthConfig["events"] = {
  async signIn({ user, account }) {
    if (account?.provider === "google" && account.providerAccountId) {
      const sql = getAuthSql();
      if (!sql) return;
      try {
        await sql`
          UPDATE users
          SET google_id = ${account.providerAccountId}
          WHERE id = ${user.id}
        `;
      } catch {
        /* silent */
      }
    }
  },
};

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth(() => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return {
      session: { strategy: "jwt" },
      trustHost: true,
      pages: { signIn: "/login" },
      providers: [...googleProviders, credentialProvider],
      callbacks: sharedCallbacks,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    };
  }

  const pool = new Pool({ connectionString: url });
  return {
    adapter: PostgresAdapter(pool),
    session: { strategy: "database" },
    trustHost: true,
    pages: { signIn: "/login" },
    providers: [...googleProviders, credentialProvider],
    callbacks: sharedCallbacks,
    events: sharedEvents,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  };
});
