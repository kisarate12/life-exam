"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/api";
import Nav from "../components/Nav";

type Task = { id: string; title: string; is_done: boolean };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const getToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    const token = data.session?.access_token;
    if (!token) throw new Error("ログインしてください");
    return token;
  }, []);

  const load = useCallback(async () => {
    try {
      setMsg("読み込み中...");
      const token = await getToken();
      const res = await fetch(apiUrl("tasks"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "API error");
      setTasks(json);
      setMsg("");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const t = title.trim();
    if (!t) return;
    try {
      setMsg("追加中...");
      const token = await getToken();
      const res = await fetch(apiUrl("tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: t }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "API error");
      setTitle("");
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleDone = async (task: Task) => {
    try {
      const token = await getToken();
      const res = await fetch(apiUrl(`tasks/${task.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_done: !task.is_done }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "API error");
      setTasks((prev) =>
        prev.map((x) => (x.id === task.id ? { ...x, is_done: !x.is_done } : x))
      );
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const t = editTitle.trim();
    if (!t) {
      setEditingId(null);
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(apiUrl(`tasks/${editingId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: t }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "API error");
      setTasks((prev) =>
        prev.map((x) => (x.id === editingId ? { ...x, title: t } : x))
      );
      setEditingId(null);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: string) => {
    try {
      const token = await getToken();
      const res = await fetch(apiUrl(`tasks/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.message ?? "API error");
      }
      setTasks((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          タスク
        </h1>

        <div className="mt-6 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="新しいタスク"
          />
          <button
            type="button"
            onClick={add}
            disabled={!title.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            追加
          </button>
        </div>

        {msg && (
          <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
            {msg}
          </p>
        )}

        <ul className="mt-6 space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <button
                type="button"
                onClick={() => toggleDone(task)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-400 text-zinc-900 dark:border-zinc-500 dark:text-zinc-100"
                aria-label={task.is_done ? "未完了にする" : "完了にする"}
              >
                {task.is_done ? "✓" : ""}
              </button>

              {editingId === task.id ? (
                <input
                  className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") {
                      setEditTitle(task.title);
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <span
                    className={`min-w-0 flex-1 cursor-pointer ${task.is_done ? "text-zinc-500 line-through dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}
                    onClick={() => startEdit(task)}
                  >
                    {task.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(task.id)}
                    className="shrink-0 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    削除
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        {tasks.length === 0 && !msg && (
          <p className="mt-6 text-zinc-500 dark:text-zinc-400">
            タスクがありません。上で追加してください。
          </p>
        )}
      </main>
    </div>
  );
}
