export default function Nav() {
  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <a
          href="/"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ホーム
        </a>
        <div className="flex gap-4">
          <a
            href="/login"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ログイン
          </a>
          <a
            href="/tasks"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            タスク
          </a>
        </div>
      </div>
    </nav>
  );
}
