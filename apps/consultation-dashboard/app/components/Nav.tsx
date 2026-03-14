"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Nav() {
  const router = useRouter();
  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--card-border)" }}
    >
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg" style={{ color: "var(--foreground)" }}>
          相談ダッシュボード
        </span>
        <Link
          href="/dashboard"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--muted)" }}
        >
          一覧
        </Link>
        <Link
          href="/connections"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--muted)" }}
        >
          接続設定
        </Link>
      </div>
      <button
        onClick={signOut}
        className="text-sm px-4 py-1.5 rounded-lg border transition-opacity hover:opacity-70"
        style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
      >
        ログアウト
      </button>
    </nav>
  );
}
