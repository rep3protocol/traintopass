import Link from "next/link";

type Props = {
  title: string | null;
  completed: boolean;
  challengeStreak: number;
};

export function DashboardChallengeCard({
  title,
  completed,
  challengeStreak,
}: Props) {
  return (
    <section className="border border-forge-border bg-forge-panel p-6 space-y-4">
      <h2 className="font-heading text-xl text-white tracking-wide">
        TODAY&apos;S CHALLENGE
      </h2>
      {title ? (
        <>
          <p className="text-sm text-neutral-200 leading-relaxed">{title}</p>
          <p className="text-xs text-neutral-500 uppercase tracking-widest">
            Challenge streak:{" "}
            <span className="text-forge-accent">{challengeStreak} days</span>
          </p>
          {completed ? (
            <p className="text-sm text-forge-accent flex items-center gap-2">
              <span aria-hidden>✓</span> Completed!
            </p>
          ) : null}
          <Link
            href="/challenge"
            className="inline-block border border-forge-border bg-forge-bg px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
          >
            {completed ? "View challenge →" : "Complete Challenge →"}
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-500">
            Today&apos;s challenge will appear here once it&apos;s published.
          </p>
          <Link
            href="/challenge"
            className="inline-block text-xs font-semibold uppercase tracking-widest text-forge-accent hover:underline"
          >
            Open challenge page →
          </Link>
        </>
      )}
    </section>
  );
}
