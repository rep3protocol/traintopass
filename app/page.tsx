import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-forge-border px-4 sm:px-8 py-4">
        <span className="font-heading text-2xl sm:text-3xl tracking-wide text-white">
          AFT <span className="text-forge-accent">FORGE</span>
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-16 sm:py-24 text-center">
        <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl max-w-4xl text-balance leading-[0.95] text-white">
          Know Your Weak Points.{" "}
          <span className="text-forge-accent">Fix Them.</span>
        </h1>
        <p className="mt-8 max-w-xl text-base sm:text-lg text-neutral-400 leading-relaxed">
          Enter your AFT scores. Get a personalized 4-week training plan built
          around your worst events.
        </p>
        <Link
          href="/calculate"
          className="mt-12 inline-block border-2 border-forge-accent bg-forge-accent px-10 py-4 font-body text-sm font-semibold uppercase tracking-widest text-forge-bg transition-colors hover:bg-transparent hover:text-forge-accent"
        >
          Analyze My Scores
        </Link>
      </main>

      <footer className="border-t border-forge-border px-4 sm:px-8 py-6 text-center text-xs text-neutral-600">
        AFT Forge — training insight tool. Not an official Army product.
      </footer>
    </div>
  );
}
