import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import {
  ADMIN_BROADCAST_USER_EMAIL,
  isBroadcastRecipientEmail,
} from "@/lib/admin-broadcast-email";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BroadcastClient } from "./broadcast-client";

export default async function AdminBroadcastPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const email = session.user.email?.trim().toLowerCase() ?? "";
  if (email !== ADMIN_BROADCAST_USER_EMAIL) redirect("/dashboard");

  let recipientCount = 0;
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    try {
      const sql = neon(url);
      const rows = (await sql`
        SELECT email
        FROM users
        WHERE email IS NOT NULL
          AND TRIM(email) <> ''
      `) as { email: string }[];
      recipientCount = rows.filter((r) =>
        isBroadcastRecipientEmail(String(r.email ?? ""))
      ).length;
    } catch {
      recipientCount = 0;
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 py-12 sm:py-16">
        <div className="w-full max-w-3xl mx-auto border border-forge-border bg-forge-panel p-6 sm:p-8 space-y-8">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl text-white tracking-wide">
              Broadcast Email
            </h1>
            <p className="mt-2 text-xs text-neutral-500 uppercase tracking-widest">
              Train to Pass
            </p>
          </div>
          <BroadcastClient recipientCount={recipientCount} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
