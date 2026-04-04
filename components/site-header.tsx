import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-forge-border px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4 sm:gap-8">
        <Link
          href="/"
          className="font-heading text-2xl sm:text-3xl tracking-wide text-white"
        >
          AFT <span className="text-forge-accent">FORGE</span>
        </Link>
        <Link
          href="/about"
          className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
        >
          About
        </Link>
      </div>
      <Link
        href="/"
        className="text-sm text-neutral-500 hover:text-forge-accent uppercase tracking-widest"
      >
        Home
      </Link>
    </header>
  );
}
