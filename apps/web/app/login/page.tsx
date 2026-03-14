"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Nav from "../components/Nav";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const signUp = async () => {
    setMsg("登録中...");
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(
      error ? error.message : "登録しました（メール確認が有効な場合は受信を確認してください）"
    );
  };

  const signIn = async () => {
    setMsg("ログイン中...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMsg(error ? error.message : "ログインしました");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMsg("ログアウトしました");
  };

  return (
    <div className="min-h-screen relative z-10">
      <Nav />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="card-rpg p-8">
          <h1 className="text-2xl font-bold">
            ログイン
          </h1>

          <label className="mt-6 block text-sm font-medium text-sub">
            メールアドレス
          </label>
          <input
            className="mt-1.5 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            type="email"
          />

          <label className="mt-4 block text-sm font-medium text-sub">
            パスワード
          </label>
          <input
            className="mt-1.5 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            type="password"
          />

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={signIn}
              disabled={!email || !password}
              className="btn-rpg-main flex-1"
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={signUp}
              disabled={!email || !password}
              className="btn-rpg-sub flex-1"
            >
              新規登録
            </button>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="btn-rpg-sub mt-4 w-full"
          >
            ログアウト
          </button>

          {msg && (
            <p className="mt-5 rounded-lg px-3 py-2 text-sm border border-[var(--rpg-border)] bg-[var(--rpg-bg-section)]/80">
              {msg}
            </p>
          )}

          <p className="mt-6 text-sm text-sub">
            <a href="/life-exam" className="text-emphasis hover:underline">
              人生審査へ
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
