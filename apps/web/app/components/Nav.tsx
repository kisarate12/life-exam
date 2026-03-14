"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    pathname === path
      ? "font-medium text-[var(--theme-gold-bright)]"
      : "text-white/90 hover:text-[var(--theme-gold-bright)] transition-colors duration-200";

  return (
    <header
      className="sticky top-0 z-10 border-b-2"
      style={{ background: "var(--theme-accent-navy)", borderColor: "var(--theme-border-emphasis)" }}
    >
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link
          href="/life-exam"
          className="text-2xl font-bold transition hover:opacity-90"
          style={{
            color: "var(--theme-gold-bright)",
            letterSpacing: "2px",
          }}
        >
          人生審査
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/life-exam" className={`rounded-lg px-3 py-1.5 ${linkClass("/life-exam")}`}>
            ホーム
          </Link>
          <Link href="/login" className={`rounded-lg px-3 py-1.5 ${linkClass("/login")}`}>
            ログイン
          </Link>
        </div>
      </nav>
    </header>
  );
}
