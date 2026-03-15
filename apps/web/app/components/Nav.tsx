"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    pathname === path
      ? "font-medium text-[var(--theme-gold-bright)] hover:text-white transition-colors duration-200"
      : "text-[var(--theme-gold-bright)] hover:text-white transition-colors duration-200";

  return (
    <header
      className="sticky top-0 z-10 border-b-2"
      style={{ background: "var(--theme-accent-navy)", borderColor: "var(--theme-border-emphasis)" }}
    >
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link
          href="/life-exam"
          className="flex items-center gap-2 text-2xl font-bold transition hover:opacity-90"
          style={{
            color: "var(--theme-gold-bright)",
            letterSpacing: "2px",
          }}
        >
          <img
            src="/top-worlds/logo-scale.png"
            alt=""
            width={32}
            height={32}
            className="nav-logo-img h-8 w-8 shrink-0 object-contain"
          />
          人生診断
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/life-exam" className={`rounded-lg px-3 py-1.5 ${linkClass("/life-exam")}`}>
            ホーム
          </Link>
          <a
            href="https://lin.ee/3nGM5xuo"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-1.5 text-[var(--theme-gold-bright)] transition-colors duration-200 hover:text-white"
          >
            LINEで相談
          </a>
        </div>
      </nav>
    </header>
  );
}
