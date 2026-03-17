import Link from "next/link";

export default function Footer() {
  return (
    <footer
      id="site-footer"
      className="mt-auto border-t py-6"
      style={{ background: "#FFFFFF", borderColor: "#E8DDD0" }}
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-center text-sm">
        <Link
          href="/privacy"
          className="text-[#9A9290] underline transition-colors hover:text-[#333333]"
        >
          プライバシーポリシー
        </Link>
      </div>
    </footer>
  );
}
