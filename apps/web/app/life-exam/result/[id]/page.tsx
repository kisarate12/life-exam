"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { LifeExamAttempt, LifeExamScore, LifeExamSubject } from "@/lib/life-exam/types";
import { getRankFromDeviation } from "@/lib/life-exam/judgement";
import { provisionalDeviationValue, deviationFromPopulation } from "@/lib/life-exam/constants";
import { SUBJECT_DISPLAY_SHORT } from "@/lib/life-exam/ver1-concepts";
import type { JudgementRank } from "@/lib/life-exam/judgement";
import { getWorldLabelDisplay, getWorldDisplay, getWorldShort } from "@/lib/life-exam/worldDisplay";
import { getCharacterResult, diagnoseFromScores, getEvolutionPaths, SUMMIT_MESSAGE, CHARACTER_CODE } from "@/lib/life-diagnosis";
import { CHARACTER_REPORTS } from "@/lib/life-diagnosis/characterReports";
import Nav from "../../../components/Nav";

/** ランキング1件のデータ構造（UI用。DBは life_exam_ranking_entries） */
export interface RankingEntry {
  nickname: string;
  totalScore: number;
  world: string;
  character: string;
  characterImage: string;
  attemptId?: string;
}

const LOADING_MESSAGES = [
  "あなたの人生を分析中...",
  "5つの資本を計算しています...",
  "全国データと照合中...",
  "偏差値を算出中...",
  "あなたのキャラクターを判定中...",
  "もうすぐ結果が出ます...",
];


/** 科目スコア(0-100)から科目別偏差値（暫定）を算出 */
function subjectDeviationFromScore(score: number): number {
  return Math.round(provisionalDeviationValue(score * 5) * 10) / 10;
}

/** 結果ページ用・短い教科名 */
function getSubjectNameShort(code: string): string {
  return SUBJECT_DISPLAY_SHORT[code] ?? code;
}

/** ランク→星の数（S=7〜F=1） */
const RANK_STAR_COUNT: Record<JudgementRank, number> = {
  S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1,
};

/** 星アイコン 20px（達成=ゴールドグラデーション、未達成=薄いベージュ） */
const STAR_SIZE = 20;
function StarIcon({ filled }: { filled: boolean }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `star-gold-${uid}`;
  if (filled) {
    return (
      <svg width={STAR_SIZE} height={STAR_SIZE} viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </linearGradient>
        </defs>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#${gradientId})`} />
      </svg>
    );
  }
  return (
    <svg width={STAR_SIZE} height={STAR_SIZE} viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#E8DDD0" />
    </svg>
  );
}

function StatStars({ filledCount }: { filledCount: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <StarIcon key={i} filled={i < filledCount} />
      ))}
    </span>
  );
}

function LegendStars({ rank }: { rank: JudgementRank }) {
  const count = RANK_STAR_COUNT[rank];
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} width={STAR_SIZE} height={STAR_SIZE} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFB84E" />
        </svg>
      ))}
    </span>
  );
}

export default function LifeExamResultPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const searchParams = useSearchParams();
  const isFromExam = searchParams?.get("from") === "exam";
  const [attempt, setAttempt] = useState<LifeExamAttempt | null>(null);
  const [scores, setScores] = useState<LifeExamScore[]>([]);
  const [subjects, setSubjects] = useState<LifeExamSubject[]>([]);
  const [comparisonStats, setComparisonStats] = useState<{
    subjects: Array<{
      subject_id: number;
      avg_same_gen: number | null;
      stddev_same_gen?: number | null;
    }>;
  } | null>(null);
  const [characterImageError, setCharacterImageError] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [rankingStats, setRankingStats] = useState<{
    globalRank: number;
    globalTotal: number;
    worldStats: Record<string, { rank: number; total: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [lineToken, setLineToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    msgTimerRef.current = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!id) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    (async () => {
      const [
        { data: attemptData, error: attemptErr },
        { data: scoresData, error: scoresErr },
        { data: subjectsData },
      ] = await Promise.all([
        supabase.from("life_exam_attempts").select("*").eq("id", id).single(),
        supabase.from("life_exam_scores").select("*").eq("attempt_id", id),
        supabase.from("life_exam_subjects").select("id, code, name_ja"),
      ]);

      if (attemptErr || !attemptData) {
        setError(attemptErr?.message ?? "結果を取得できませんでした。");
        setLoading(false);
        return;
      }
      const attemptRow = attemptData as LifeExamAttempt;
      setAttempt(attemptRow);
      setCharacterImageError(false);
      setScores((scoresData as LifeExamScore[]) ?? []);
      setSubjects((subjectsData as LifeExamSubject[]) ?? []);

      const { data: statsData } = await supabase.rpc("get_life_exam_comparison_stats", { p_attempt_id: id });
      if (statsData && typeof statsData === "object" && "subjects" in statsData) {
        const st = statsData as {
          subjects?: Array<{
            subject_id: number;
            avg_same_gen: number | null;
            stddev_same_gen?: number | null;
          }>;
        };
        setComparisonStats({ subjects: Array.isArray(st.subjects) ? st.subjects : [] });
      }

      if (scoresErr) setError(scoresErr.message);
      setLoading(false);
    })();
  }, [id]);

  /** ランキング登録・順位取得 */
  useEffect(() => {
    if (!id || !attempt || !scores.length || !subjects.length) return;
    const scoreBySubject: Record<number, number> = {};
    scores.forEach((row) => {
      scoreBySubject[row.subject_id] = Number(row.score);
    });
    // キャラクター判定はスコア絶対値ベースで統一
    const characterResult = getCharacterResult(diagnoseFromScores(scoreBySubject));
    const worldShort = getWorldShort(characterResult.world);
    const totalScoreDisplay = Math.round((Number(attempt.total_score) / 500) * 900);

    (async () => {
      await supabase.from("life_exam_ranking_entries").upsert(
        {
          attempt_id: id,
          user_id: attempt.user_id,
          nickname: "名無しの冒険者",
          world: worldShort,
          character_name: characterResult.name,
          character_image: characterResult.imagePath,
          total_score: totalScoreDisplay,
        },
        { onConflict: "attempt_id" }
      );

      const { data, error: err } = await supabase.rpc("get_life_exam_ranking_position", {
        p_total_score: totalScoreDisplay,
      });
      if (err) return;
      const raw = data as { global_rank?: number; global_total?: number; world_stats?: Record<string, { rank: number; total: number }> } | null;
      if (!raw) return;
      setRankingStats({
        globalRank: raw.global_rank ?? 0,
        globalTotal: raw.global_total ?? 0,
        worldStats: raw.world_stats ?? {},
      });
    })();
  }, [attempt, scores, subjects, id, comparisonStats]);

  if (loading) {
    if (isFromExam) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-8">
            <div className="relative h-48 w-48">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#ffffff18" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="44"
                  fill="none"
                  stroke="#FFB84E"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="276.5"
                  strokeDashoffset="69"
                  style={{ animation: "spin-dash 1.6s linear infinite" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-3xl">⚖️</span>
                <span className="text-xs font-bold text-[#FFB84E]">採点中</span>
              </div>
            </div>
            <p
              key={msgIndex}
              className="text-center text-base font-medium text-[#555566]"
              style={{ animation: "fadein 0.4s ease" }}
            >
              {LOADING_MESSAGES[msgIndex]}
            </p>
          </div>
          <style>{`
            @keyframes spin-dash {
              0%   { stroke-dashoffset: 276.5; }
              100% { stroke-dashoffset: -276.5; }
            }
            @keyframes fadein {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 rounded-full border-4 border-[#F0EBE3] border-t-[#F57550]"
            style={{ animation: "spin 0.8s linear infinite" }}
          />
          <p className="text-sm text-[#9A9290]">結果を読み込んでいます...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen relative z-10">
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-20">
          <div className="card-rpg p-8">
            <p className="text-[var(--rpg-accent-red)]">{error ?? "結果が見つかりません。"}</p>
            <Link href="/life-exam" className="text-emphasis mt-4 inline-block hover:underline">
              トップへ戻る
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const scoreBySubject = scores.reduce<Record<number, number>>((acc, row) => {
    acc[row.subject_id] = row.score;
    return acc;
  }, {});

  const subjectsSorted = [...subjects].sort((a, b) => a.id - b.id);

  /** 科目別ランク（星マーク用）：絶対値ベース */
  const subjectRanks: Record<string, JudgementRank> = {};
  subjectsSorted.forEach((s) => {
    const score = Number(scoreBySubject[s.id] ?? 0);
    subjectRanks[getSubjectNameShort(s.code)] = getRankFromDeviation(subjectDeviationFromScore(score));
  });

  // キャラクター判定・進化パスはスコア絶対値ベースで統一
  const characterResult = getCharacterResult(diagnoseFromScores(scoreBySubject));
  const evolutionPaths = getEvolutionPaths(characterResult.id);
  const characterReport = CHARACTER_REPORTS[characterResult.id];

  const totalScore = Number(attempt.total_score);
  const TOTAL_MAX_DISPLAY = 900;
  const totalScoreDisplay = Math.round((totalScore / 500) * TOTAL_MAX_DISPLAY);

  const worldDisplay = getWorldDisplay(characterResult.world);
  const worldShort = getWorldShort(characterResult.world);
  const worldLabelDisplay = getWorldLabelDisplay(characterResult.world);

  const globalRankDisplay =
    rankingStats && rankingStats.globalTotal > 0 ? `${rankingStats.globalRank}位` : null;
  const worldStat = rankingStats?.worldStats?.[worldShort];
  const worldRankDisplay = worldStat && worldStat.total > 0 ? `${worldStat.rank}位` : null;
  const worldTotalDisplay = worldStat?.total ?? 0;

  const resultUrl = typeof window !== "undefined" ? `${window.location.origin}/life-exam/result/${id}` : "";
  const challengeUrl = `${resultUrl}?ref=challenge`;

  const subjectRankLine = ["収入", "資産", "健康", "人間関係", "時間"]
    .map((name) => `${name}：${subjectRanks[name] ?? "?"}`)
    .join(" / ");
  const shareXText = `人生診断やったら「${characterResult.name}」判定された...\n${subjectRankLine}\nあなたは何タイプ？→ ${challengeUrl}\n#人生診断`;
  const shareXUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareXText)}`;
  const shareLineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(challengeUrl)}&text=${encodeURIComponent(`私は「${characterResult.name}」でした！あなたは何タイプ？ #人生診断`)}`;

  const handleDownloadCard = async () => {
    if (!shareCardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `人生診断_${characterResult.name}.png`;
      a.click();
    } catch {
      alert("画像の生成に失敗しました。スクリーンショットをお試しください。");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePurchase = async () => {
    if (!id || isPurchasing) return;
    setIsPurchasing(true);
    try {
      const res = await fetch("/api/life-exam/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: id }),
      });
      const { url, error: apiError } = await res.json();
      if (apiError || !url) {
        alert("決済ページの取得に失敗しました。しばらくしてからお試しください。");
        return;
      }
      window.location.href = url;
    } catch {
      alert("エラーが発生しました。しばらくしてからお試しください。");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleLineClick = async () => {
    if (!id || isGeneratingToken) return;
    setIsGeneratingToken(true);
    try {
      const res = await fetch("/api/life-exam/generate-report-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: id }),
      });
      const { token, error: apiError } = await res.json();
      if (apiError || !token) {
        alert("発行コードの生成に失敗しました。しばらくしてからお試しください。");
        return;
      }
      setLineToken(token);
    } catch {
      alert("エラーが発生しました。しばらくしてからお試しください。");
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
    }
  };

  const statRows = [
    { label: "収入", rank: subjectRanks["収入"] ?? "C" },
    { label: "資産", rank: subjectRanks["資産"] ?? "C" },
    { label: "健康", rank: subjectRanks["健康"] ?? "C" },
    { label: "人間関係", rank: subjectRanks["人間関係"] ?? "C" },
    { label: "時間", rank: subjectRanks["時間"] ?? "C" },
  ] as const;

  return (
    <div className="min-h-screen relative z-10">
      {/* スティッキーCTAバー（モバイル用） */}
      {!shareModalOpen && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
          style={{ background: "linear-gradient(0deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 80%, rgba(255,255,255,0) 100%)", paddingTop: 16, paddingBottom: 12, paddingLeft: 16, paddingRight: 16 }}
        >
          <a
            href="#unlock"
            className="block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white transition hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #F57550, #FFB84E)", boxShadow: "0 4px 16px rgba(245,117,80,0.45)" }}
          >
            📊 詳細レポートを解放する
          </a>
        </div>
      )}

      {/* 発行コードモーダル */}
      {lineToken && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                LINEで無料レポートを受け取る
              </h3>
              <button
                type="button"
                onClick={() => setLineToken(null)}
                className="text-[#9A9290] hover:text-[#333333] text-xl leading-none"
                aria-label="閉じる"
              >✕</button>
            </div>

            {/* STEP 1: QRコード */}
            <div className="mb-4">
              <p className="text-xs font-bold text-[#9A9290] mb-2">① LINEを友達追加</p>
              <div className="flex items-center gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(process.env.NEXT_PUBLIC_LINE_BOT_URL ?? "https://line.me/R/ti/p/@364zkemw")}`}
                  alt="LINE QRコード"
                  width={100}
                  height={100}
                  className="rounded-lg border border-[#E8DDD0] shrink-0"
                />
                <div>
                  <p className="text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.7 }}>
                    QRコードを読み込んで<br />LINE公式を友達追加
                  </p>
                  <a
                    href={process.env.NEXT_PUBLIC_LINE_BOT_URL ?? "https://line.me/R/ti/p/@364zkemw"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                    style={{ background: "#06C755" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden>
                      <path d="M12 2C6.48 2 2 5.92 2 10.72c0 3.16 1.84 5.94 4.6 7.66-.18.66-.68 2.38-.77 2.75-.12.47.17.46.36.34.15-.1 2.4-1.62 3.38-2.28.77.11 1.57.17 2.43.17 5.52 0 10-3.92 10-8.64C22 5.92 17.52 2 12 2z"/>
                    </svg>
                    LINEで開く
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-[#E8DDD0] my-4" />

            {/* STEP 2: 発行コード */}
            <div>
              <p className="text-xs font-bold text-[#9A9290] mb-2">② 発行コードをLINEに送信</p>
              <button
                type="button"
                onClick={() => handleCopyToken(lineToken)}
                className="w-full rounded-xl border-2 border-dashed border-[#06C755] bg-[#F0FFF5] py-3 text-center transition hover:bg-[#E0FFF0] active:scale-[0.98]"
              >
                <p className="text-2xl font-bold tracking-[0.2em] text-[#333333]" style={{ fontFamily: "monospace" }}>
                  {lineToken}
                </p>
                <p className="mt-1 text-xs text-[#06C755] font-bold">
                  {copied ? "コピーしました！" : "タップでコピー"}
                </p>
              </button>
              <p className="mt-2 text-xs text-[#9A9290] text-center" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                追加後、このコードをLINEのトークに送信すると<br />レポートURLが届きます
              </p>
            </div>
          </div>
        </div>
      )}

      {/* シェア用モーダル */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-start p-4 pt-14"
          style={{ background: "rgba(0,0,0,0.9)" }}
          role="dialog"
          aria-modal="true"
          aria-label="シェア"
        >
          <button
            type="button"
            onClick={() => setShareModalOpen(false)}
            className="absolute right-4 top-4 z-10 text-2xl leading-none hover:opacity-80"
            style={{ color: "#FFD700" }}
            aria-label="閉じる"
          >
            ✕
          </button>
          <div className="w-full max-w-sm flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
            <div ref={shareCardRef} className="font-diagnosis-card w-full overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white p-8 shadow-lg">
              <div className="text-center rounded-xl border border-[#E8DDD0] bg-white py-3 px-4" style={{ marginBottom: 16, borderLeft: "4px solid #F57550" }}>
                <span className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{worldLabelDisplay}</span>
              </div>
              <div className="flex justify-center" style={{ marginBottom: 16 }}>
                <div className="flex max-h-[240px] max-w-[240px] items-center justify-center">
                  {!characterImageError ? (
                    <img src={characterResult.imagePath} alt="" className="h-auto w-auto max-h-[240px] max-w-[240px] object-contain" style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.15))" }} />
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-[#E8DDD0] bg-white text-sm text-[#9A9290]">画像を配置</div>
                  )}
                </div>
              </div>
              <div className="text-center" style={{ marginBottom: 16 }}>
                <span className="inline-block mb-1 rounded-full px-2 py-0.5 text-xs font-bold tracking-widest" style={{ background: "#F5F0EB", color: "#706860", fontFamily: "monospace" }}>
                  {CHARACTER_CODE[characterResult.id]}
                </span>
                <h2 className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: "1.5rem" }}>{characterResult.name}</h2>
              </div>
              <div className="text-center" style={{ marginBottom: 16 }}>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontWeight: 400 }}>{characterResult.description}</p>
              </div>
              <div className="border-t border-[#E8DDD0] pt-4">
                {statRows.map(({ label, rank }) => (
                  <div key={label} className="flex items-center justify-between py-2 text-sm" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                    <span className="text-[#333333]">{label}</span>
                    <StatStars filledCount={RANK_STAR_COUNT[rank as JudgementRank]} />
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-[#E8DDD0] pt-3 text-center">
                <p className="text-[#D0C8C0]" style={{ fontSize: 11 }}>{resultUrl}</p>
                <p className="mt-1 text-[#D0C8C0]" style={{ fontSize: 11 }}>#人生診断</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadCard}
            disabled={isDownloading}
            className="mt-4 shrink-0 w-full max-w-sm rounded-xl py-3 text-sm font-bold transition hover:opacity-80 disabled:opacity-50"
            style={{ background: "#FFD700", color: "#333333" }}
          >
            {isDownloading ? "生成中..." : "📥 画像を保存する"}
          </button>
        </div>
      )}

      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:py-10 sm:pb-10">
        {/* 診断結果カード */}
        <section className="card-rpg p-4 sm:p-6">
          <div className="font-diagnosis-card mx-auto max-w-sm overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-white p-8 shadow-[var(--shadow-card)]" style={{ borderColor: "#E8DDD0" }}>
            {/* 世界名 */}
            <div
              className="text-center rounded-xl border border-[#E8DDD0] bg-white py-3 px-4"
              style={{ marginBottom: 16, borderLeft: "4px solid #F57550" }}
            >
              <span className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                {worldLabelDisplay}
              </span>
            </div>
            {/* キャラクター画像 */}
            <div className="flex justify-center" style={{ marginBottom: 16 }}>
              <div className="flex max-h-[240px] max-w-[240px] items-center justify-center">
                {!characterImageError ? (
                  <img
                    src={characterResult.imagePath}
                    alt={`${characterResult.name}のイラスト`}
                    className="h-auto w-auto max-h-[240px] max-w-[240px] object-contain"
                    style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.15))" }}
                    onError={() => setCharacterImageError(true)}
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-[#E8DDD0] bg-white text-sub text-sm" aria-hidden>
                    画像を配置
                  </div>
                )}
              </div>
            </div>
            {/* キャラクター名 */}
            <div className="text-center" style={{ marginBottom: 16 }}>
              <span className="inline-block mb-1 rounded-full px-2 py-0.5 text-xs font-bold tracking-widest" style={{ background: "#F5F0EB", color: "#706860", fontFamily: "monospace" }}>
                {CHARACTER_CODE[characterResult.id]}
              </span>
              <h2 className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: "1.5rem" }}>
                {characterResult.name}
              </h2>
            </div>
            {/* 説明文 */}
            <div className="text-center" style={{ marginBottom: 16 }}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontWeight: 400 }}>
                {characterResult.description}
              </p>
            </div>
            {/* 5ステータス・星 */}
            <div className="border-t border-[#E8DDD0] pt-4">
              {statRows.map(({ label, rank }) => (
                <div key={label} className="flex items-center justify-between py-2 text-sm" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  <span className="text-[#333333]">{label}</span>
                  <StatStars filledCount={RANK_STAR_COUNT[rank as JudgementRank]} />
                </div>
              ))}
            </div>
          </div>
          {/* 凡例 S〜F */}
          <div
            className="font-diagnosis-card mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 rounded-xl border border-[#E8DDD0] bg-white px-4 py-3 text-sm text-[#333333]"
            style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}
          >
            {(["S", "A", "B", "C", "D", "E", "F"] as const).map((r) => (
              <span key={r} className="inline-flex items-center gap-1">
                <span className="font-bold text-[#333333]">{r}</span>
                <span>：</span>
                <LegendStars rank={r} />
              </span>
            ))}
          </div>
        </section>

        {/* 世界戦闘力 */}
        <section className="card-rpg mt-6 p-4 sm:p-6">
          <h2 className="section-header mb-4 text-lg">世界戦闘力</h2>
          <p className="mb-2 text-2xl font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            戦闘力：{totalScoreDisplay.toLocaleString("ja-JP")} / {TOTAL_MAX_DISPLAY.toLocaleString("ja-JP")}
          </p>
          <div className="mb-6 h-3 w-full overflow-hidden rounded-full" style={{ background: "rgba(245,117,80,0.2)" }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${(totalScoreDisplay / TOTAL_MAX_DISPLAY) * 100}%`,
                background: "linear-gradient(90deg, #FFB84E, #F57550)",
              }}
            />
          </div>
          <div className="flex flex-col gap-3 text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            <p className="text-base font-bold">
              全世界：{globalRankDisplay != null ? `${globalRankDisplay} / ${rankingStats!.globalTotal.toLocaleString("ja-JP")}人` : "—"}
            </p>
            <p className="text-base font-bold">
              同世界（{worldDisplay.name}）：{worldRankDisplay != null ? `${worldRankDisplay} / ${worldTotalDisplay.toLocaleString("ja-JP")}人` : "—"}
            </p>
          </div>
        </section>

        {/* あなたの診断結果 */}
        {characterReport && (
          <section className="card-rpg mt-6 p-4 sm:p-6">
            <h2 className="section-header mb-4 text-lg">📖 あなたの診断結果</h2>
            <div className="space-y-3">
              {characterReport.resultSummary.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.9 }}>
                  {para}
                </p>
              ))}
            </div>
            {characterReport.historicalFigures.length > 0 && (
              <div className="mt-4 rounded-xl bg-[#F7F4F0] p-3">
                <p className="mb-2 text-xs font-bold text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  同じタイプの著名人
                </p>
                <div className="flex flex-wrap gap-2">
                  {characterReport.historicalFigures.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-[#E8DDD0] bg-white px-3 py-1 text-xs text-[#333333]"
                      style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 進化ロードマップ */}
        <section className="card-rpg mt-6 p-4 sm:p-6">
          <h2 className="section-header mb-5 text-lg">🗺️ 進化ロードマップ</h2>

          {evolutionPaths.isSummit ? (
            <p className="text-center text-sm text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              {SUMMIT_MESSAGE}
            </p>
          ) : (
            <div className="space-y-4">
              {/* 進化先 */}
              {evolutionPaths.upgrades.length > 0 && (
                <div>
                  <div className="flex flex-wrap justify-center gap-3">
                    {evolutionPaths.upgrades.map((path) => (
                      <div
                        key={path.dimension}
                        className="flex flex-col items-center rounded-2xl p-2 text-center"
                        style={{ width: 88, background: "#F7FAF9", border: "2px solid #43756B" }}
                      >
                        <div className="mb-1.5 overflow-hidden rounded-xl bg-white" style={{ width: 72, height: 72 }}>
                          {!imageErrors[`up-${path.target.id}`] ? (
                            <img src={path.target.imagePath} alt="" className="h-full w-full object-contain"
                              onError={() => setImageErrors((e) => ({ ...e, [`up-${path.target.id}`]: true }))} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-[#9A9290]">画像</div>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-[#43756B]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                          {path.icon} {path.dimension}
                        </p>
                        <p className="mt-0.5 font-bold text-[#333333] leading-tight" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 12 }}>
                          {path.target.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 矢印コネクター（上）＋ラベル */}
              <div className="flex flex-col items-center gap-1 py-1">
                <div className="h-4 w-0.5 bg-[#E8DDD0]" />
                <p className="text-xs font-bold text-[#43756B]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  ▲ 進化先（この軸を改善すると…）
                </p>
              </div>

              {/* 現在のキャラクター（中央） */}
              <div className="flex justify-center">
                <div
                  className="flex flex-col items-center rounded-2xl p-2 text-center"
                  style={{ width: 88, background: "#F7F7F7", border: "2px solid #F57550" }}
                >
                  <div className="mb-1.5 overflow-hidden rounded-xl bg-white" style={{ width: 72, height: 72 }}>
                    {!imageErrors[characterResult.id] ? (
                      <img src={characterResult.imagePath} alt="" className="h-full w-full object-contain"
                        onError={() => setImageErrors((e) => ({ ...e, [characterResult.id]: true }))} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[#9A9290]">画像</div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-[#F57550]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                    現在
                  </p>
                  <p className="mt-0.5 font-bold text-[#333333] leading-tight" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 12 }}>
                    {characterResult.name}
                  </p>
                </div>
              </div>

              {/* 転落先 */}
              {evolutionPaths.downgrades.length > 0 && (
                <div>
                  {/* 矢印コネクター（下）＋ラベル */}
                  <div className="flex flex-col items-center gap-1 py-1 mb-2">
                    <p className="text-xs font-bold text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                      ▼ 転落先（この軸が悪化すると…）
                    </p>
                    <div className="h-4 w-0.5 bg-[#E8DDD0]" />
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    {evolutionPaths.downgrades.map((path) => (
                      <div
                        key={path.dimension}
                        className="flex flex-col items-center rounded-2xl p-2 text-center"
                        style={{ width: 88, background: "#F5F5F5", border: "2px solid #C8C0B8" }}
                      >
                        <div className="mb-1.5 overflow-hidden rounded-xl bg-white" style={{ width: 72, height: 72 }}>
                          {!imageErrors[`dn-${path.target.id}`] ? (
                            <img src={path.target.imagePath} alt="" className="h-full w-full object-contain"
                              onError={() => setImageErrors((e) => ({ ...e, [`dn-${path.target.id}`]: true }))} />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-[#9A9290]">画像</div>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                          {path.icon} {path.dimension}
                        </p>
                        <p className="mt-0.5 font-bold text-[#333333] leading-tight" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 12 }}>
                          {path.target.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </section>

        {/* ── 有料コンテンツ ロックプレビュー ─────────────────────────────── */}

        {/* ロック: ステータス分析 */}
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              📊 ステータス詳細分析
            </p>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "#FFF3ED", color: "#F57550" }}>
              🔒 購入で解放
            </span>
          </div>
          <div className="pointer-events-none select-none" style={{ filter: "blur(4px)", opacity: 0.5 }}>
            <div className="mb-4 space-y-3">
              {["金融", "時間", "人間関係", "健康"].map((label) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-[#333333]">{label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-[#E8DDD0]">
                    <div className="h-full rounded" style={{ width: "60%", background: "linear-gradient(90deg, #FFB84E, #F57550)" }} />
                  </div>
                  <span className="w-16 text-right text-xs text-[#9A9290]">上位〇〇%</span>
                </div>
              ))}
            </div>
            <div className="mx-auto h-[180px] w-[180px] rounded-full border-4 border-[#E8DDD0]" />
          </div>
        </div>

        {/* ロック: 強みと才能 / 悩みと罠 */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              💪 強みと才能 / ⚠️ 悩みと罠
            </p>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "#FFF3ED", color: "#F57550" }}>
              🔒 購入で解放
            </span>
          </div>
          <div className="pointer-events-none select-none space-y-2" style={{ filter: "blur(4px)", opacity: 0.5 }}>
            {[80, 64, 72, 56, 68].map((w, i) => (
              <div
                key={i}
                className="h-12 rounded-lg"
                style={{
                  width: `${w}%`,
                  borderLeft: `4px solid ${i < 3 ? "#43756B" : "#F57550"}`,
                  background: i < 3 ? "#F7FAF9" : "#FFF8F5",
                }}
              />
            ))}
          </div>
        </div>

        {/* ロック: 進化するための道すじ（詳細） */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              🗺️ 進化するための道すじ
            </p>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "#FFF3ED", color: "#F57550" }}>
              🔒 購入で解放
            </span>
          </div>
          <div className="pointer-events-none select-none space-y-3" style={{ filter: "blur(4px)", opacity: 0.5 }}>
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 rounded-xl p-3" style={{ background: "#F7FAF9", border: "1px solid #E8DDD0" }}>
                <div className="h-16 w-16 shrink-0 rounded-lg bg-[#E8DDD0]" />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 rounded bg-[#E8DDD0]" />
                  <div className="h-3 w-24 rounded bg-[#E8DDD0]" />
                  <div className="h-3 w-40 rounded bg-[#E8DDD0]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ロック: 人生の方向性アドバイス */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              🧭 人生の方向性アドバイス
            </p>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "#FFF3ED", color: "#F57550" }}>
              🔒 購入で解放
            </span>
          </div>
          <div className="pointer-events-none select-none pl-5" style={{ filter: "blur(4px)", opacity: 0.5 }}>
            <div className="relative border-l-2 border-[#E8DDD0] pl-4 space-y-4">
              {["#F57550", "#FFB84E", "#43756B", "#6B66A3"].map((color, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-2.5 w-20 rounded" style={{ background: color }} />
                  <div className="h-3 w-full rounded bg-[#E8DDD0]" />
                  <div className="h-3 w-4/5 rounded bg-[#E8DDD0]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ロック: 相性診断 */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              🤝 相性診断
            </p>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "#FFF3ED", color: "#F57550" }}>
              🔒 購入で解放
            </span>
          </div>
          <div className="pointer-events-none select-none space-y-2" style={{ filter: "blur(4px)", opacity: 0.5 }}>
            {["#43756B", "#FFB84E", "#F57550"].map((color, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ border: `1.5px solid ${color}`, background: "#F7F7F7" }}>
                <div className="h-12 w-12 shrink-0 rounded-lg bg-[#E8DDD0]" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 rounded" style={{ background: color }} />
                  <div className="h-3 w-36 rounded bg-[#E8DDD0]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 有料コンテンツ解放CTA */}
        <section id="unlock" className="card-rpg mt-6 p-5 sm:p-6">
          <p className="mb-1 text-xs text-[#9A9290] text-center" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            ステータス分析・強み・進化クエスト・相性診断
          </p>
          <h2 className="mb-5 text-base font-bold text-[#333333] text-center" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            詳細レポートで続きを見る
          </h2>

          {/* LINE CTA（メイン） */}
          <button
            onClick={handleLineClick}
            disabled={isGeneratingToken}
            className="flex flex-col items-center justify-center gap-1 w-full rounded-2xl px-5 py-4 text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            style={{ background: "#06C755", boxShadow: "0 4px 20px rgba(6,199,85,0.4)" }}
          >
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
                <path d="M12 2C6.48 2 2 5.92 2 10.72c0 3.16 1.84 5.94 4.6 7.66-.18.66-.68 2.38-.77 2.75-.12.47.17.46.36.34.15-.1 2.4-1.62 3.38-2.28.77.11 1.57.17 2.43.17 5.52 0 10-3.92 10-8.64C22 5.92 17.52 2 12 2z"/>
              </svg>
              <span className="text-base font-bold text-white">
                {isGeneratingToken ? "発行中..." : "LINE友達追加で無料で見る"}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold" style={{ color: "#06C755" }}>無料</span>
            </div>
            <span className="text-xs text-white opacity-75">発行コードをLINEに送信するだけ</span>
          </button>

          {/* 区切り */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 border-t border-[#E8DDD0]" />
            <span className="text-xs text-[#C0B8B0]">または</span>
            <div className="flex-1 border-t border-[#E8DDD0]" />
          </div>

          {/* 980円 CTA（サブ） */}
          <button
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="w-full rounded-2xl px-5 py-3.5 text-center transition hover:brightness-105 disabled:opacity-50 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #FFE8DC, #FFF0E0)", border: "1.5px solid #F5956A" }}
          >
            <p className="text-sm font-bold text-[#F57550]">{isPurchasing ? "移動中..." : "¥980 で今すぐ購入する"}</p>
            <p className="mt-0.5 text-xs text-[#C0906A]">登録不要・すぐに閲覧できます</p>
          </button>
        </section>

        {/* シェア */}
        <section className="card-rpg mt-6 p-6 sm:p-8">
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="btn-rpg-sub w-full py-3 text-sm"
          >
            シェア用にカードを表示する
          </button>
          <p className="mt-4 text-center text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            友達に挑戦状を送る
          </p>
          <p className="text-center text-xs text-[#9A9290]">あなたは何タイプ？と問いかけよう</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <a href={shareXUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center transition hover:opacity-70" aria-label="Xでシェア">
              <img src="/icons/x.svg" alt="" className="h-9 w-9 shrink-0" />
            </a>
            <a href={shareLineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center transition hover:opacity-70" aria-label="LINEでシェア">
              <img src="/icons/line.svg" alt="" className="h-9 w-9 shrink-0" />
            </a>
            <button type="button" onClick={handleDownloadCard} className="inline-flex items-center justify-center transition hover:opacity-70" aria-label="Instagramでシェア">
              <img src="/icons/instagram.svg" alt="" className="h-9 w-9 shrink-0" />
            </button>
            <button type="button" onClick={handleDownloadCard} className="inline-flex items-center justify-center transition hover:opacity-70" aria-label="TikTokでシェア">
              <img src="/icons/tiktok.svg" alt="" className="h-9 w-9 shrink-0" />
            </button>
          </div>
        </section>


        <div className="mt-10 flex justify-center">
          <Link href="/life-exam" className="btn-rpg-main">
            トップへ
          </Link>
        </div>
      </main>
    </div>
  );
}
