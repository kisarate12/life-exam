"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Nav from "../components/Nav";

export default function MePage() {
  const [text, setText] = useState("読み込み中...");

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setText(error.message);
        return;
      }
      setText(
        JSON.stringify({ user: data.session?.user ?? null }, null, 2)
      );
    });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          セッション
        </h1>
        <pre className="mt-4 overflow-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          {text}
        </pre>
      </main>
    </div>
  );
}
