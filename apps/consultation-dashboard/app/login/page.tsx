"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--background)" }}>
      <div className="w-full max-w-md rounded-xl border p-8 shadow-lg"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--card-border)" }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
          相談返信ダッシュボード
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          マネージャーアカウントでログイン
        </p>

        <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
          メールアドレス
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="manager@example.com"
          className="w-full rounded-lg border px-4 py-3 mb-4 focus:outline-none"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--card-border)",
            color: "var(--foreground)",
          }}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
        />

        <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
          パスワード
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border px-4 py-3 mb-6 focus:outline-none"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--card-border)",
            color: "var(--foreground)",
          }}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
        />

        <button
          onClick={signIn}
          disabled={loading}
          className="w-full rounded-lg py-3 font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>

        {msg && (
          <p className="mt-4 text-sm text-center" style={{ color: "var(--danger)" }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
