"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "../components/Nav";

type Draft = {
  id: string;
  body: string;
  draft_type?: "short" | "doc";
  doc_content?: string | null;
  status: "pending" | "accepted" | "rejected";
  updated_at: string;
};

type Consultation = {
  id: string;
  platform: "gmail" | "slack" | "google_chat";
  sender_display: string;
  body: string;
  platform_thread_id: string | null;
  platform_message_id: string;
  received_at: string;
  drafts: Draft | null;
};

const PLATFORM_ICON: Record<string, string> = {
  gmail: "G",
  slack: "S",
  google_chat: "C",
};

const PLATFORM_COLOR: Record<string, string> = {
  gmail: "#ea4335",
  slack: "#4a154b",
  google_chat: "#1a73e8",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "承認待ち",
  accepted: "送信済み",
  rejected: "却下",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--warning)",
  accepted: "var(--success)",
  rejected: "var(--danger)",
};

export default function DashboardPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchConsultations = useCallback(async () => {
    setLoading(true);
    const url =
      platformFilter === "all"
        ? "/api/consultations"
        : `/api/consultations?platform=${platformFilter}`;
    const res = await fetch(url);
    const data = await res.json();
    setConsultations(data.consultations ?? []);
    setLoading(false);
  }, [platformFilter]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  function showMsg(text: string, ok: boolean) {
    setActionMsg({ text, ok });
    setTimeout(() => setActionMsg(null), 4000);
  }

  async function handleSync() {
    setSyncing(true);
    const res = await fetch("/api/consultations/sync", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showMsg(`同期完了: ${data.synced} 件取得`, true);
      fetchConsultations();
    } else {
      showMsg(data.error ?? "同期に失敗しました", false);
    }
    setSyncing(false);
  }

  async function handleGenerateDrafts() {
    setGenerating(true);
    const res = await fetch("/api/drafts/generate", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showMsg(`下書き生成完了: ${data.generated} 件`, true);
      fetchConsultations();
    } else {
      showMsg(data.error ?? "下書き生成に失敗しました", false);
    }
    setGenerating(false);
  }

  async function handleAccept(draftId: string) {
    setAcceptingId(draftId);
    const res = await fetch(`/api/drafts/${draftId}/accept`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showMsg("返信を送信しました", true);
      fetchConsultations();
    } else {
      showMsg(data.error ?? "送信に失敗しました", false);
    }
    setAcceptingId(null);
  }

  async function handleReject(draftId: string) {
    const res = await fetch(`/api/drafts/${draftId}/reject`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showMsg("下書きを却下しました", true);
      fetchConsultations();
    } else {
      showMsg(data.error ?? "却下に失敗しました", false);
    }
  }

  async function handleRegenerate(draftId: string) {
    showMsg("再生成中...", true);
    const res = await fetch(`/api/drafts/${draftId}/regenerate`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showMsg("下書きを再生成しました", true);
      fetchConsultations();
    } else {
      showMsg(data.error ?? "再生成に失敗しました", false);
    }
  }

  const filtered =
    platformFilter === "all"
      ? consultations
      : consultations.filter((c) => c.platform === platformFilter);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Nav />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              相談一覧
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
              {filtered.length} 件
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-opacity disabled:opacity-50 hover:opacity-80"
              style={{ borderColor: "var(--card-border)", color: "var(--foreground)" }}
            >
              {syncing ? "同期中..." : "同期"}
            </button>
            <button
              onClick={handleGenerateDrafts}
              disabled={generating}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-80"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              {generating ? "生成中..." : "下書きを生成"}
            </button>
          </div>
        </div>

        {/* アクションメッセージ */}
        {actionMsg && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: actionMsg.ok ? "#0f2a1a" : "#3f1111",
              color: actionMsg.ok ? "var(--success)" : "var(--danger)",
              border: `1px solid ${actionMsg.ok ? "var(--success)" : "var(--danger)"}`,
            }}
          >
            {actionMsg.text}
          </div>
        )}

        {/* フィルタ */}
        <div className="flex gap-2 mb-6">
          {["all", "gmail", "slack", "google_chat"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor:
                  platformFilter === p ? "var(--accent)" : "var(--card)",
                color:
                  platformFilter === p ? "#fff" : "var(--muted)",
                border: `1px solid ${platformFilter === p ? "var(--accent)" : "var(--card-border)"}`,
              }}
            >
              {p === "all"
                ? "すべて"
                : p === "gmail"
                  ? "Gmail"
                  : p === "slack"
                    ? "Slack"
                    : "Google Chat"}
            </button>
          ))}
        </div>

        {/* 相談カード一覧 */}
        {loading ? (
          <p style={{ color: "var(--muted)" }}>読み込み中...</p>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl border"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <p style={{ color: "var(--muted)" }}>相談がありません</p>
            <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
              「同期」ボタンでメッセージを取得してください
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((consultation) => {
              const draft = consultation.drafts;
              const isExpanded = expandedId === consultation.id;

              return (
                <div
                  key={consultation.id}
                  className="rounded-xl border overflow-hidden"
                  style={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--card-border)",
                  }}
                >
                  {/* カードヘッダー */}
                  <div
                    className="flex items-start gap-4 p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : consultation.id)}
                  >
                    {/* プラットフォームアイコン */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: PLATFORM_COLOR[consultation.platform] }}
                    >
                      {PLATFORM_ICON[consultation.platform]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm truncate" style={{ color: "var(--foreground)" }}>
                          {consultation.sender_display}
                        </span>
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--muted)" }}>
                          {new Date(consultation.received_at).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2" style={{ color: "var(--muted)" }}>
                        {consultation.body}
                      </p>

                      {/* 下書きステータス */}
                      {draft && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${STATUS_COLOR[draft.status]}20`,
                              color: STATUS_COLOR[draft.status],
                            }}
                          >
                            {STATUS_LABEL[draft.status]}
                          </span>
                          {(draft.draft_type === "doc" || (draft.doc_content != null && draft.doc_content !== "")) && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: "var(--accent)20",
                                color: "var(--accent)",
                              }}
                            >
                              Doc
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-xs flex-shrink-0" style={{ color: "var(--muted)" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* 展開パネル */}
                  {isExpanded && (
                    <div
                      className="border-t px-5 py-4"
                      style={{ borderColor: "var(--card-border)" }}
                    >
                      {/* 相談本文 */}
                      <div className="mb-4">
                        <div className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
                          相談内容
                        </div>
                        <div
                          className="rounded-lg px-4 py-3 text-sm whitespace-pre-wrap"
                          style={{
                            backgroundColor: "var(--background)",
                            color: "var(--foreground)",
                            border: "1px solid var(--card-border)",
                          }}
                        >
                          {consultation.body}
                        </div>
                      </div>

                      {/* 下書き */}
                      {draft ? (
                        <div>
                          <div className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
                            {(draft.draft_type === "doc" || draft.doc_content) ? "送信メッセージ（Accept で Doc 作成・URL 差し込み）" : "AI 下書き"}
                          </div>
                          <div
                            className="rounded-lg px-4 py-3 text-sm whitespace-pre-wrap mb-2"
                            style={{
                              backgroundColor: "var(--background)",
                              color: "var(--foreground)",
                              border: "1px solid var(--card-border)",
                            }}
                          >
                            {draft.body}
                          </div>
                          {(draft.draft_type === "doc" || draft.doc_content) && draft.doc_content && (
                            <details className="mb-4">
                              <summary className="text-xs font-medium cursor-pointer" style={{ color: "var(--muted)" }}>
                                Doc に書き込む本文（プレビュー）
                              </summary>
                              <div
                                className="rounded-lg px-4 py-3 text-sm whitespace-pre-wrap mt-2 max-h-48 overflow-y-auto"
                                style={{
                                  backgroundColor: "var(--background)",
                                  color: "var(--foreground)",
                                  border: "1px solid var(--card-border)",
                                }}
                              >
                                {draft.doc_content}
                              </div>
                            </details>
                          )}

                          {/* アクションボタン */}
                          {draft.status === "pending" && (
                            <div className="flex gap-3 flex-wrap items-center">
                              <button
                                onClick={() => handleAccept(draft.id)}
                                disabled={acceptingId === draft.id}
                                className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                                style={{ backgroundColor: "var(--success)", color: "#fff" }}
                              >
                                {acceptingId === draft.id
                                  ? (draft.draft_type === "doc" || draft.doc_content)
                                    ? "Doc 作成・送信中..."
                                    : "送信中..."
                                  : "Accept（送信）"}
                              </button>
                              <button
                                onClick={() => handleReject(draft.id)}
                                className="px-5 py-2 rounded-lg text-sm font-medium border transition-opacity hover:opacity-80"
                                style={{
                                  borderColor: "var(--danger)",
                                  color: "var(--danger)",
                                }}
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleRegenerate(draft.id)}
                                className="px-5 py-2 rounded-lg text-sm font-medium border transition-opacity hover:opacity-80"
                                style={{
                                  borderColor: "var(--card-border)",
                                  color: "var(--muted)",
                                }}
                              >
                                再生成
                              </button>
                            </div>
                          )}

                          {draft.status === "accepted" && (
                            <p className="text-sm" style={{ color: "var(--success)" }}>
                              この返信は送信済みです
                            </p>
                          )}

                          {draft.status === "rejected" && (
                            <div className="flex items-center gap-3">
                              <p className="text-sm" style={{ color: "var(--danger)" }}>
                                却下されました
                              </p>
                              <button
                                onClick={() => handleRegenerate(draft.id)}
                                className="px-4 py-1.5 rounded-lg text-sm border transition-opacity hover:opacity-80"
                                style={{
                                  borderColor: "var(--card-border)",
                                  color: "var(--muted)",
                                }}
                              >
                                再生成
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: "var(--muted)" }}>
                          下書きがありません。「下書きを生成」ボタンで生成してください。
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
