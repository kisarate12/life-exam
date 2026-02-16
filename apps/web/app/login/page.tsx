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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav />
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          ログイン
        </h1>

        <input
          className="mt-4 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          type="email"
        />
        <input
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          type="password"
        />

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={signIn}
            disabled={!email || !password}
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={signUp}
            disabled={!email || !password}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            新規登録
          </button>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="mt-3 w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ログアウト
        </button>

        {msg && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>
        )}

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          <a href="/me" className="underline hover:no-underline">セッション確認 /me</a>
          {" · "}
          <a href="/tasks" className="underline hover:no-underline">タスク /tasks</a>
        </p>
      </main>
    </div>
  );
}
