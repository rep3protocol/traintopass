import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WorkoutLogClient } from "@/components/workout-log-client";

export default async function LogPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-8">
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-block text-xs font-semibold uppercase tracking-widest text-forge-accent hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="font-heading text-4xl text-white">Workout Log</h1>
        </div>
        <WorkoutLogClient userId={session.user.id} />
      </main>
      <SiteFooter />
    </div>
  );
}
