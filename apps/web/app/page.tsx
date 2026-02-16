import Link from "next/link";
import Nav from "./components/Nav";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          タスク管理
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          ログインしてタスクの追加・完了・編集・削除ができます。
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-center font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            ログイン / 新規登録
          </Link>
          <Link
            href="/tasks"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-center font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            タスク一覧
          </Link>
        </div>
      </main>
    </div>
  );
}
