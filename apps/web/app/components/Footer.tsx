import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="mt-auto border-t-2 py-6"
      style={{ background: "var(--theme-accent-navy)", borderColor: "var(--theme-border-emphasis)" }}
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-center text-sm">
        <Link
          href="/privacy"
          className="text-[var(--theme-gold-bright)] underline transition-colors hover:text-white"
        >
          プライバシーポリシー
        </Link>
      </div>
    </footer>
  );
}
