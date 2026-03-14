"use client";

import { useEffect, useState } from "react";
import Nav from "../components/Nav";

type Connection = {
  id: string;
  platform: string;
  platform_account_id: string | null;
  extra_data: Record<string, string>;
  updated_at: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  gmail: "Gmail",
  slack: "Slack",
  google_chat: "Google Chat (Phase 2)",
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    // URL パラメータのメッセージ表示
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success) setStatusMsg(`${PLATFORM_LABELS[success] ?? success} の接続が完了しました`);
    if (error) setStatusMsg(`接続に失敗しました: ${error}`);

    fetchConnections();
  }, []);

  async function fetchConnections() {
    setLoading(true);
    const res = await fetch("/api/connections");
    const data = await res.json();
    setConnections(data.connections ?? []);
    setLoading(false);
  }

  async function connectPlatform(platform: "gmail" | "slack" | "google_chat") {
    const res = await fetch(`/api/connections/${platform}`);
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  }

  const connectedPlatforms = new Set(connections.map((c) => c.platform));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
          プラットフォーム接続設定
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          相談を取得・返信するプラットフォームを接続してください。
        </p>

        {statusMsg && (
          <div
            className="mb-6 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: statusMsg.includes("失敗") ? "#3f1111" : "#0f2a1a",
              color: statusMsg.includes("失敗") ? "var(--danger)" : "var(--success)",
              border: `1px solid ${statusMsg.includes("失敗") ? "var(--danger)" : "var(--success)"}`,
            }}
          >
            {statusMsg}
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--muted)" }}>読み込み中...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {(["gmail", "google_chat"] as const).map((platform) => {
              const conn = connections.find((c) => c.platform === platform);
              const isConnected = connectedPlatforms.has(platform);

              return (
                <div
                  key={platform}
                  className="flex items-center justify-between px-5 py-4 rounded-xl border"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--card-border)",
                  }}
                >
                  <div>
                    <div className="font-medium mb-0.5" style={{ color: "var(--foreground)" }}>
                      {PLATFORM_LABELS[platform]}
                    </div>
                    {isConnected ? (
                      <div className="text-xs" style={{ color: "var(--success)" }}>
                        接続済み
                        {conn?.platform_account_id && ` (${conn.platform_account_id})`}
                        {conn?.extra_data?.team_name && ` — ${conn.extra_data.team_name}`}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        未接続
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => connectPlatform(platform)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: isConnected ? "transparent" : "var(--accent)",
                      color: isConnected ? "var(--muted)" : "#fff",
                      border: isConnected ? "1px solid var(--card-border)" : "none",
                    }}
                  >
                    {isConnected ? "再接続" : "接続"}
                  </button>
                </div>
              );
            })}

          </div>
        )}
      </main>
    </div>
  );
}
