"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { LifeExamAttempt, LifeExamScore, LifeExamSubject } from "@/lib/life-exam/types";
import { getRankFromDeviation } from "@/lib/life-exam/judgement";
import { provisionalDeviationValue, deviationFromPopulation } from "@/lib/life-exam/constants";
import { SUBJECT_DISPLAY_SHORT } from "@/lib/life-exam/ver1-concepts";
import type { JudgementRank } from "@/lib/life-exam/judgement";
import { RANK_FILL_PERCENT, RANK_COLOR } from "@/lib/life-exam/rankConstants";
import { getCharacterResult, getEvolutionPaths, CHARACTER_CODE, diagnoseFromScores } from "@/lib/life-diagnosis";
import { CHARACTER_REPORTS } from "@/lib/life-diagnosis/characterReports";
import Nav from "../../../../components/Nav";
import { StatusRadarChart } from "../StatusRadarChart";

const STAT_ORDER = ["資産", "収入", "時間", "人間関係", "健康"] as const;

const STAT_COMMENTS: Record<string, Record<JudgementRank, string>> = {
  資産: { S: "資産は完璧。お金に一生困らない盤石な基盤を築いています", A: "素晴らしい資産水準。このまま維持・拡大を続けましょう", B: "安定した資産があります。次のステージへの土台は整っています", C: "資産形成はこれから。仕組みづくりが次の課題です", D: "資産の土台がまだ薄い状態です", E: "資産がほぼない状態。早急な対応が必要です", F: "資産ゼロの危機的状況です" },
  収入: { S: "収入は最高水準。稼ぐ力は本物です", A: "高い収入を誇ります。市場価値が高い証拠です", B: "安定した収入があります。次は資産への転換を考えましょう", C: "収入を上げる余地があります", D: "収入が厳しい状況です", E: "収入が非常に低い状態です", F: "収入がほぼない状態です" },
  時間: { S: "時間は完全に自由。人生の主導権を握っています", A: "十分な自由時間があります。人生を豊かに使えています", B: "時間にある程度の余裕があります。うまくコントロールできています", C: "時間がギリギリの状態です", D: "時間に追われています", E: "時間がほぼない危機的状況です", F: "時間が完全に枯渇しています" },
  人間関係: { S: "人間関係は最高水準。豊かなつながりが人生を支えています", A: "素晴らしい人間関係。信頼できる人に恵まれています", B: "安定した人間関係があります。大切なつながりを育てましょう", C: "人間関係にやや課題があります", D: "孤立が進んでいる状態です", E: "人間関係がほぼない状態です", F: "完全に孤立している状態です" },
  健康: { S: "健康は完璧。すべての活動の土台が整っています", A: "素晴らしい健康状態。この状態を維持し続けましょう", B: "健康は安定しています。小さな習慣を積み重ねましょう", C: "健康にやや不安があります", D: "健康が危うい状態です", E: "健康状態が深刻です", F: "健康が限界に近い状態です" },
};


// 4軸スライダー定義
const AXIS_DEFS = [
  { index: 0, icon: "💰", label: "金融", badLabel: "貧困", goodLabel: "富裕", subjects: ["資産", "収入"] as const, good: "M", bad: "P" },
  { index: 1, icon: "⏰", label: "時間", badLabel: "奴隷", goodLabel: "自由", subjects: ["時間"] as const, good: "F", bad: "B" },
  { index: 2, icon: "🤝", label: "人間関係", badLabel: "孤立", goodLabel: "充実", subjects: ["人間関係"] as const, good: "C", bad: "L" },
  { index: 3, icon: "💊", label: "健康", badLabel: "虚弱", goodLabel: "健全", subjects: ["健康"] as const, good: "H", bad: "S" },
] as const;

// チャプターナビ定義
const CHAPTERS = [
  { id: "chapter-character", label: "キャラクター" },
  { id: "chapter-capital", label: "5つの資本" },
  { id: "chapter-traits", label: "あなたの特徴" },
  { id: "chapter-evolution", label: "進化の道筋" },
  { id: "chapter-compatibility", label: "相性診断" },
] as const;

function ChapterNav({ activeId }: { activeId: string }) {
  return (
    <div className="sticky z-30 overflow-x-auto border-b border-[#E8DDD0] bg-white" style={{ top: 56 }}>
      <div className="flex min-w-max px-2">
        {CHAPTERS.map((ch) => (
          <a
            key={ch.id}
            href={`#${ch.id}`}
            className="shrink-0 px-3 py-3 text-xs font-medium transition-colors"
            style={{
              color: activeId === ch.id ? "#F57550" : "#9A9290",
              borderBottom: activeId === ch.id ? "2px solid #F57550" : "2px solid transparent",
              fontFamily: "var(--font-noto-serif-jp), serif",
            }}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(ch.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {ch.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/** 円形スコアインジケーター（16personalities風） */
function CircularScoreIndicator({ subjectName, rank }: { subjectName: string; rank: JudgementRank }) {
  const fill = RANK_FILL_PERCENT[rank];
  const color = RANK_COLOR[rank];
  const r = 28;
  const cx = 34;
  const cy = 34;
  const circumference = 2 * Math.PI * r;
  const dashLength = (fill / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div className="relative w-full" style={{ aspectRatio: "1" }}>
        <svg width="100%" height="100%" viewBox="0 0 68 68">
          {/* 背景円 */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E8DDD0" strokeWidth={6} />
          {/* スコア円弧 */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dashLength} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        {/* 中央ランク文字 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold" style={{ color }}>{rank}</span>
        </div>
      </div>
      <span className="text-[11px] font-medium text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
        {subjectName}
      </span>
      <span className="text-[10px] text-[#9A9290]">{fill}%</span>
    </div>
  );
}

/** 科目別スライダー比較（あなた vs 同世代平均） */
function SubjectComparisonSlider({
  rank,
  userScore,
  avgSameGen,
  avgIsFallback,
  sameGenPercent,
}: {
  rank: JudgementRank;
  userScore: number;
  avgSameGen: number | null;
  avgIsFallback: boolean;
  sameGenPercent: string;
}) {
  const userFill = Math.min(98, Math.max(2, userScore));
  const avgFill = avgSameGen != null ? Math.min(98, Math.max(2, avgSameGen)) : null;
  const color = RANK_COLOR[rank];

  return (
    <div>
      {/* ── トラック（Section③ の 4軸スライダーと同じ構造） ── */}
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-y-0 flex items-center" style={{ left: 0, right: 0 }}>
          {/* ベース */}
          <div className="h-1.5 w-full rounded-full" style={{ background: "#E8DDD0" }} />
          {/* あなたの位置までグラデーション */}
          <div
            className="absolute left-0 h-1.5 rounded-full transition-[width] duration-500"
            style={{ width: `${userFill}%`, background: `linear-gradient(90deg, ${color}30, ${color})` }}
          />
          {/* 同世代平均マーカー（○ 白抜き、やや小さめ） */}
          {avgFill != null && (
            <div
              className="absolute h-4 w-4 rounded-full border-2 bg-white"
              style={{
                left: `calc(${avgFill}% - 8px)`,
                borderColor: "#9A9290",
              }}
            />
          )}
          {/* あなたのマーカー（● 塗り、大きめ・前面） */}
          <div
            className="absolute h-5 w-5 rounded-full border-2 border-white"
            style={{
              left: `calc(${userFill}% - 10px)`,
              background: color,
              boxShadow: `0 0 0 2px ${color}40, 0 1px 4px rgba(0,0,0,0.2)`,
              zIndex: 1,
            }}
          />
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center justify-between mt-0.5 px-0.5">
        <span className="text-[9px] text-[#C0B8B0]">低</span>
        <div className="flex items-center gap-3">
          {avgFill != null && (
            <div className="flex items-center gap-1">
              <div className="rounded-full border-2 bg-white shrink-0" style={{ width: 10, height: 10, borderColor: "#9A9290" }} />
              <span className="text-[10px] text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                {avgIsFallback ? "全体平均" : "同世代平均"}{sameGenPercent !== "—" ? `（${sameGenPercent}）` : ""}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="rounded-full shrink-0" style={{ width: 10, height: 10, background: color }} />
            <span className="text-[10px] font-bold" style={{ color, fontFamily: "var(--font-noto-serif-jp), serif" }}>
              あなた
            </span>
          </div>
        </div>
        <span className="text-[9px] text-[#C0B8B0]">高</span>
      </div>
    </div>
  );
}

/** 年代バンドを "XX代" 形式に変換 */
function formatAgeBand(band: string | null): string {
  if (!band) return "";
  const m = band.match(/^(\d+)/);
  return m ? `${m[1]}代` : band;
}

/** 性別を日本語に変換 */
function formatGender(gender: string | null): string {
  if (!gender) return "";
  const g = gender.toLowerCase();
  if (g === "male" || g === "m" || g === "男") return "男性";
  if (g === "female" || g === "f" || g === "女") return "女性";
  return gender;
}

function getSubjectNameShort(code: string): string {
  return SUBJECT_DISPLAY_SHORT[code] ?? code;
}

function subjectDeviationFromScore(score: number): number {
  return Math.round(provisionalDeviationValue(score * 5) * 10) / 10;
}

function formatPercentile(rank: number, total: number): string {
  if (total <= 0) return "—";
  const pctFromTop = (rank / total) * 100;
  if (pctFromTop < 50) {
    const display = pctFromTop < 1 ? pctFromTop.toFixed(2) : Math.round(pctFromTop).toString();
    return `上位${display}%`;
  }
  const pctFromBottom = ((total - rank) / total) * 100;
  const display = pctFromBottom < 1 ? pctFromBottom.toFixed(2) : Math.round(pctFromBottom).toString();
  return `下位${display}%`;
}

export default function ReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  const purchasedParam = searchParams?.get("purchased") === "1";

  const [attempt, setAttempt] = useState<LifeExamAttempt | null>(null);
  const [scores, setScores] = useState<LifeExamScore[]>([]);
  const [subjects, setSubjects] = useState<LifeExamSubject[]>([]);
  const [comparisonStats, setComparisonStats] = useState<{
    subjects: Array<{
      subject_id: number;
      avg_all: number | null;
      stddev_all?: number | null;
      avg_same_gen: number | null;
      stddev_same_gen?: number | null;
      rank_all: number;
      total_all: number;
      rank_same_gen: number;
      total_same_gen: number;
    }>;
  } | null>(null);
  const [isPurchased, setIsPurchased] = useState<boolean | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [pollingPurchase, setPollingPurchase] = useState(false);
  const [pollingFailed, setPollingFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string>(CHAPTERS[0].id);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  async function loadComparisonStats(attemptId: string) {
    const { data: statsData } = await supabase.rpc("get_life_exam_comparison_stats", { p_attempt_id: attemptId });
    if (statsData && typeof statsData === "object" && "subjects" in statsData) {
      const st = statsData as {
        subjects?: Array<{
          subject_id: number;
          avg_all: number | null;
          stddev_all?: number | null;
          avg_same_gen: number | null;
          stddev_same_gen?: number | null;
          rank_all: number;
          total_all: number;
          rank_same_gen: number;
          total_same_gen: number;
        }>;
      };
      setComparisonStats({ subjects: Array.isArray(st.subjects) ? st.subjects : [] });
    }
  }

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      const [
        { data: attemptData, error: attemptErr },
        { data: scoresData },
        { data: subjectsData },
        { data: purchaseData },
      ] = await Promise.all([
        supabase.from("life_exam_attempts").select("*").eq("id", id).single(),
        supabase.from("life_exam_scores").select("*").eq("attempt_id", id),
        supabase.from("life_exam_subjects").select("id, code, name_ja"),
        supabase.from("life_exam_report_purchases").select("attempt_id, ai_analysis").eq("attempt_id", id).maybeSingle(),
      ]);

      if (attemptErr || !attemptData) {
        setError(attemptErr?.message ?? "結果を取得できませんでした。");
        setLoading(false);
        return;
      }

      setAttempt(attemptData as LifeExamAttempt);
      setScores((scoresData as LifeExamScore[]) ?? []);
      setSubjects((subjectsData as LifeExamSubject[]) ?? []);

      if (purchaseData) {
        await loadComparisonStats(id);
        const purchase = purchaseData as { attempt_id: string; ai_analysis?: string | null };
        if (purchase.ai_analysis) {
          setAiAnalysis(purchase.ai_analysis);
        }
        setIsPurchased(true);
        setLoading(false);
      } else if (purchasedParam) {
        setIsPurchased(false);
        setLoading(false);
        setPollingPurchase(true);
      } else {
        setIsPurchased(false);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!pollingPurchase || !id) return;
    let attempts = 0;
    let timerId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      const { data } = await supabase.from("life_exam_report_purchases").select("attempt_id, ai_analysis").eq("attempt_id", id).maybeSingle();
      if (data) {
        await loadComparisonStats(id);
        const purchase = data as { attempt_id: string; ai_analysis?: string | null };
        if (purchase.ai_analysis) {
          setAiAnalysis(purchase.ai_analysis);
        }
        setIsPurchased(true);
        setPollingPurchase(false);
        return;
      }
      attempts++;
      if (attempts >= 5) {
        setPollingPurchase(false);
        setPollingFailed(true);
        return;
      }
      timerId = setTimeout(poll, 2000);
    };

    timerId = setTimeout(poll, 2000);
    return () => clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingPurchase, id]);

  // AI分析をオンデマンドで生成・取得
  useEffect(() => {
    if (!isPurchased || !id || aiAnalysis) return;
    setIsLoadingAnalysis(true);
    fetch("/api/life-exam/generate-ai-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: id }),
    })
      .then((r) => r.json())
      .then((data: { analysis?: string }) => {
        if (data.analysis) setAiAnalysis(data.analysis);
      })
      .catch(() => {})
      .finally(() => setIsLoadingAnalysis(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPurchased, id]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    CHAPTERS.forEach((ch) => {
      const el = document.getElementById(ch.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveChapter(ch.id); },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [isPurchased]);

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
      if (apiError || !url) { alert("決済ページの取得に失敗しました。しばらくしてからお試しください。"); return; }
      window.location.href = url;
    } catch {
      alert("エラーが発生しました。しばらくしてからお試しください。");
    } finally {
      setIsPurchasing(false);
    }
  };

  const spinnerJsx = (msg: string) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-[#F0EBE3] border-t-[#F57550]" style={{ animation: "spin 0.8s linear infinite" }} />
        <p className="text-base font-medium text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{msg}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (loading) return spinnerJsx("読み込んでいます...");
  if (pollingPurchase) return spinnerJsx("決済を確認中...");

  if (pollingFailed) {
    return (
      <div className="min-h-screen relative z-10">
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-20">
          <div className="card-rpg p-8 text-center">
            <p className="mb-2 text-base font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              決済の確認に時間がかかっています
            </p>
            <p className="mb-6 text-sm text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.8 }}>
              決済が完了している場合、数分後に再度このページを開いてください。
            </p>
            <Link href={`/life-exam/result/${id}`} className="inline-block rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ background: "#F57550" }}>
              結果ページに戻る
            </Link>
          </div>
        </main>
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
            <Link href="/life-exam" className="mt-4 inline-block text-[#F57550] hover:underline">トップへ戻る</Link>
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

  // 科目別比較データ（偏差値・パーセンタイル・ランク数）
  const comparisonRowsDetailed = subjectsSorted.map((s) => {
    const score = Number(scoreBySubject[s.id] ?? 0);
    const st = comparisonStats?.subjects?.find((x) => x.subject_id === s.id);
    // ランク判定は絶対値ベース（スコア暫定偏差値）で安定させる
    const rankDev = subjectDeviationFromScore(score);
    const rank = getRankFromDeviation(rankDev);
    // 比較バー・偏差値表示は人口統計データを優先使用
    const dev =
      deviationFromPopulation(score, st?.avg_same_gen ?? null, st?.stddev_same_gen ?? null) ??
      rankDev;
    const sameGenPercent = st && st.total_same_gen > 0 ? formatPercentile(st.rank_same_gen, st.total_same_gen) : "—";
    const allPercent = st && st.total_all > 0 ? formatPercentile(st.rank_all, st.total_all) : "—";
    const sameGenRankText = st && st.total_same_gen > 0 ? `${st.total_same_gen}人中${st.rank_same_gen}位` : null;
    const allRankText = st && st.total_all > 0 ? `${st.total_all}人中${st.rank_all}位` : null;
    return {
      subjectName: getSubjectNameShort(s.code),
      score,
      avgSameGen: st?.avg_same_gen ?? st?.avg_all ?? null,
      avgIsFallback: st?.avg_same_gen == null && st?.avg_all != null,
      rank,
      dev: Math.round(dev * 10) / 10,
      sameGenPercent,
      allPercent,
      sameGenRankText,
      allRankText,
    };
  });

  const rowsForDisplay = STAT_ORDER.map((name) => {
    const row = comparisonRowsDetailed.find((r) => r.subjectName === name);
    return {
      subjectName: name,
      score: row?.score ?? 0,
      avgSameGen: row?.avgSameGen ?? null,
      avgIsFallback: row?.avgIsFallback ?? false,
      rank: (row?.rank ?? "C") as JudgementRank,
      dev: row?.dev ?? 50,
      sameGenPercent: row?.sameGenPercent ?? "—",
      allPercent: row?.allPercent ?? "—",
      sameGenRankText: row?.sameGenRankText ?? null,
      allRankText: row?.allRankText ?? null,
    };
  });

  // キャラクター判定・進化パスはすべてスコア絶対値ベースで統一
  const characterResult = getCharacterResult(diagnoseFromScores(scoreBySubject));
  const characterReport = CHARACTER_REPORTS[characterResult.id];
  const characterCode = CHARACTER_CODE[characterResult.id] ?? "";
  const evolutionPaths = getEvolutionPaths(characterResult.id);

  // 4軸スライダー計算
  const axisSliders = AXIS_DEFS.map((axis) => {
    const codeChar = characterCode[axis.index] ?? "";
    const isGood = codeChar === axis.good;
    const subjectFills = axis.subjects.map((subj) => {
      const row = rowsForDisplay.find((r) => r.subjectName === subj);
      return row ? RANK_FILL_PERCENT[row.rank] : 55;
    });
    const avgFill = Math.round(subjectFills.reduce((a, b) => a + b, 0) / subjectFills.length);
    const repRow = rowsForDisplay.find((r) => r.subjectName === axis.subjects[0]);
    return { ...axis, isGood, avgFill, repRank: repRow?.rank ?? "C" as JudgementRank };
  });

  // 4軸ごとの代表スコア・パーセンタイルを解決（金融は資産/収入の良い方）
  const axisWithStats = axisSliders.map((axis) => {
    let repSubjectName = axis.subjects[0] as string;
    if (axis.subjects.length > 1) {
      const scores = axis.subjects.map((s) => rowsForDisplay.find((r) => r.subjectName === s)?.score ?? 0);
      repSubjectName = axis.subjects[scores.indexOf(Math.max(...scores))] as string;
    }
    const repRow = rowsForDisplay.find((r) => r.subjectName === repSubjectName);
    return {
      ...axis,
      sameGenPercent: repRow?.sameGenPercent ?? "—",
    };
  });
  const strongestAxis = axisWithStats.reduce((a, b) => (a.avgFill > b.avgFill ? a : b));
  const weakestAxis = axisWithStats.reduce((a, b) => (a.avgFill < b.avgFill ? a : b));
  const weakestUpgradePath = evolutionPaths.upgrades.find((p) => p.dimension === weakestAxis.label);

  // axisNotes key mapping
  const AXIS_LABEL_TO_NOTE_KEY: Record<string, keyof NonNullable<typeof characterReport>["axisNotes"]> = {
    "金融": "financial",
    "時間": "time",
    "人間関係": "relationship",
    "健康": "health",
  };
  const weakestAxisNoteKey = AXIS_LABEL_TO_NOTE_KEY[weakestAxis.label] ?? "financial";

  // attempt level data
  const heroDeviation = attempt.same_age_deviation_value;
  const ageBandLabel = formatAgeBand(attempt.age_band_at_attempt);
  const genderLabel = formatGender(attempt.gender_at_attempt);

  const rankingCards = [
    {
      label: `同世代${ageBandLabel ? `（${ageBandLabel}）` : ""}`,
      rank: attempt.same_gen_rank,
      total: attempt.same_gen_total,
    },
    {
      label: `性別${genderLabel ? `（${genderLabel}）` : ""}`,
      rank: attempt.gender_rank,
      total: attempt.gender_total,
    },
    {
      label: `同世代×性別`,
      rank: attempt.same_gen_gender_rank,
      total: attempt.same_gen_gender_total,
    },
  ];

  // 未購入 → 2択UI表示
  if (!isPurchased) {
    return (
      <div className="min-h-screen flex flex-col relative z-10">
        <Nav />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">

            {/* キャラクター + タイトル */}
            <div className="text-center mb-5">
              <div className="relative inline-block mb-3">
                <img
                  src={characterResult.imagePath}
                  alt={characterResult.name}
                  className="w-20 h-20 object-contain"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.12))" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span
                  className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full text-sm"
                  style={{ background: "#FFF3EE", border: "1.5px solid #E8DDD0" }}
                >🔒</span>
              </div>
              <h2
                className="text-lg font-bold text-[#333333]"
                style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}
              >
                「{characterResult.name}」の詳細レポート
              </h2>
              <p className="mt-1 text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                診断結果をさらに深掘りした分析レポートです
              </p>
            </div>

            {/* コンテンツ一覧 */}
            <div className="card-rpg px-4 py-3 mb-5">
              {[
                ["📊", "5科目の詳細パーセンタイル分析"],
                ["🏆", "全国・同世代・同性別ランキング"],
                ["🤝", "相性の良いキャラクター診断"],
                ["⚔️", "あなた専用の改善クエスト"],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-2.5 py-2 border-b border-[#F0EBE5] last:border-0">
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{label}</span>
                </div>
              ))}
            </div>

            {/* LINE CTA（メイン） */}
            <a
              href={`/api/life-exam/line-redirect?attempt_id=${id}`}
              className="flex flex-col items-center justify-center gap-1 w-full rounded-2xl px-5 py-4 text-white transition hover:brightness-110 active:scale-[0.98]"
              style={{ background: "#06C755", boxShadow: "0 4px 20px rgba(6,199,85,0.4)" }}
            >
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
                  <path d="M12 2C6.48 2 2 5.92 2 10.72c0 3.16 1.84 5.94 4.6 7.66-.18.66-.68 2.38-.77 2.75-.12.47.17.46.36.34.15-.1 2.4-1.62 3.38-2.28.77.11 1.57.17 2.43.17 5.52 0 10-3.92 10-8.64C22 5.92 17.52 2 12 2z"/>
                </svg>
                <span className="text-base font-bold text-white">LINE友達追加で無料で見る</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold" style={{ color: "#06C755" }}>無料</span>
              </div>
              <span className="text-xs text-white opacity-75">友達追加するだけ・30秒で完了</span>
            </a>

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

          </div>
        </main>
      </div>
    );
  }

  // resultSummary の段落分割
  const summaryParagraphs = characterReport?.resultSummary.split("\n\n") ?? [];

  return (
    <div className="min-h-screen relative z-10">
      <Nav />
      <ChapterNav activeId={activeChapter} />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            詳細レポート
          </h1>
          <Link href={`/life-exam/result/${id}`} className="text-sm font-medium text-[#F57550] hover:underline">
            ← 結果に戻る
          </Link>
        </div>

        {/* ── Section 1: あなたのキャラクター ─────────────────────────────────── */}
        <section id="chapter-character" className="card-rpg p-4 sm:p-6" ref={(el) => { sectionRefs.current["chapter-character"] = el; }}>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#F57550" }}>1</span>
            <h2 className="section-header text-lg">📖 あなたのキャラクター</h2>
          </div>
          <p className="mb-5 text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            {characterResult.world}
          </p>

          {/* キャラクター画像 + 名前 */}
          <div className="flex flex-col items-center mb-6">
            <img
              src={characterResult.imagePath}
              alt={characterResult.name}
              className="object-contain"
              style={{ width: 160, height: 160, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <p className="mt-3 font-bold text-[#333333] text-center" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 22 }}>
              {characterResult.name}
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#9A9290]" style={{ letterSpacing: "0.12em" }}>
              {characterCode}
            </p>
          </div>

          {characterReport && (
            <>
              {/* 最初の段落を引用ブロックで表示 */}
              {summaryParagraphs[0] && (
                <blockquote
                  className="mb-4 rounded-r-lg py-3 pr-4 text-sm italic text-[#555555]"
                  style={{ borderLeft: "4px solid #C0B8B0", paddingLeft: 16, fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.9 }}
                >
                  {summaryParagraphs[0]}
                </blockquote>
              )}
              {/* 残りの段落は通常テキスト */}
              <div className="space-y-3 text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.9 }}>
                {summaryParagraphs.slice(1).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {characterReport.historicalFigures.map((name) => (
                  <span key={name} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "#F5F0EB", color: "#706860", fontFamily: "var(--font-noto-serif-jp), serif" }}>
                    {name}
                  </span>
                ))}
              </div>

            </>
          )}
        </section>

        {/* ── AI個人分析 ───────────────────────────────────────────────────────── */}
        <section className="card-rpg mt-6 p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#6B66A3" }}>AI</span>
            <h2 className="section-header text-lg">🔮 あなただけの人生分析</h2>
          </div>
          <p className="mb-4 text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            あなたの回答データをもとにAIが生成した、パーソナライズされた分析レポートです
          </p>

          {isLoadingAnalysis ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 rounded-full border-4 border-[#F0EBE3] border-t-[#6B66A3]" style={{ animation: "spin 0.8s linear infinite" }} />
              <p className="text-sm text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>AIが分析中です... （30秒ほどかかります）</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : aiAnalysis ? (
            <div className="space-y-4 text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 2.0 }}>
              {aiAnalysis.split(/\n\n+/).map((block, i) => {
                if (block.startsWith("## ")) {
                  return (
                    <h3
                      key={i}
                      className="mt-5 first:mt-0 font-bold text-[#333333]"
                      style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 15, borderBottom: "1px solid #E8DDD0", paddingBottom: 6 }}
                    >
                      {block.replace(/^## /, "")}
                    </h3>
                  );
                }
                return <p key={i}>{block}</p>;
              })}
            </div>
          ) : (
            <p className="text-sm text-[#9A9290] text-center py-4" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              分析の生成に失敗しました。ページを再読み込みしてください。
            </p>
          )}
        </section>

        {/* ── Section 2: 5つの資本のデータ ──────────────────────────────────────── */}
        <section id="chapter-capital" className="card-rpg mt-6 p-4 sm:p-6" ref={(el) => { sectionRefs.current["chapter-capital"] = el; }}>
          <div className="mb-5 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#F57550" }}>2</span>
            <h2 className="section-header text-lg">📊 5つの資本のデータ</h2>
          </div>

          {/* ── ① 同世代比較ヒーロー ──────────────────────────────────────────── */}
          <div className="mb-7 rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #F7F4F0, #F0EBE3)" }}>
            <p className="mb-1 text-center text-xs font-bold text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              同世代{ageBandLabel ? `（${ageBandLabel}）` : ""}偏差値
            </p>
            <p className="mb-4 text-center font-bold tabular-nums" style={{ fontSize: 52, color: "#F57550", lineHeight: 1, fontFamily: "var(--font-noto-serif-jp), serif" }}>
              {heroDeviation != null ? heroDeviation.toFixed(1) : "—"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {rankingCards.map((card) => (
                <div key={card.label} className="rounded-xl bg-white p-3 text-center shadow-sm">
                  <p className="mb-1 text-[10px] font-bold text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                    {card.label}
                  </p>
                  {card.rank != null && card.total != null ? (
                    <>
                      <p className="text-base font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                        {card.rank}<span className="text-xs font-normal text-[#9A9290]">位</span>
                      </p>
                      <p className="text-[10px] text-[#9A9290]">{card.total}人中</p>
                    </>
                  ) : (
                    <p className="text-sm text-[#C0B8B0]">—</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── ② 円形スコアインジケーター × 5科目 ─────────────────────────── */}
          <div className="mb-7">
            <h3 className="mb-3 text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              科目別ランク
            </h3>
            <div className="grid grid-cols-5 gap-1 rounded-xl border border-[#E8DDD0] bg-white px-3 py-4">
              {rowsForDisplay.map((row) => (
                <CircularScoreIndicator key={row.subjectName} subjectName={row.subjectName} rank={row.rank} />
              ))}
            </div>
          </div>

          {/* ── ③ 4軸スライダー ────────────────────────────────────────────── */}
          <div className="mb-7">
            <h3 className="mb-3 text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              4軸の診断ポジション
            </h3>
            <div className="space-y-5 rounded-xl border border-[#E8DDD0] bg-white p-4">
              {axisSliders.map((axis) => (
                <div key={axis.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                      {axis.icon} {axis.label}
                    </span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: axis.isGood ? "#43756B" : "#F57550" }}>
                      {axis.avgFill}%
                    </span>
                  </div>
                  <div className="relative h-6 flex items-center">
                    <div className="absolute inset-y-0 flex items-center" style={{ left: 36, right: 36 }}>
                      <div className="h-1.5 w-full rounded-full" style={{ background: "#E8DDD0" }} />
                      <div
                        className="absolute left-0 h-1.5 rounded-full transition-[width] duration-500"
                        style={{
                          width: `${axis.avgFill}%`,
                          background: axis.isGood
                            ? "linear-gradient(90deg, #E8DDD0, #43756B)"
                            : "linear-gradient(90deg, #F57550, #E8DDD0)",
                        }}
                      />
                      <div
                        className="absolute h-4 w-4 rounded-full border-2 border-white shadow-sm"
                        style={{
                          left: `calc(${axis.avgFill}% - 8px)`,
                          background: axis.isGood ? "#43756B" : "#F57550",
                          boxShadow: `0 0 0 2px ${axis.isGood ? "#43756B" : "#F57550"}40`,
                        }}
                      />
                    </div>
                    <span className="absolute left-0 text-[10px] text-[#9A9290]" style={{ width: 32, textAlign: "center" }}>{axis.badLabel}</span>
                    <span className="absolute right-0 text-[10px] text-[#9A9290]" style={{ width: 32, textAlign: "center" }}>{axis.goodLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ④ 五角形グラフ ──────────────────────────────────────────────── */}
          <div className="mb-7 flex justify-center">
            <StatusRadarChart rows={rowsForDisplay} />
          </div>

          {/* ── ⑤ 5科目 詳細比較（偏差値 + 同世代ランク強化） ──────────────── */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              同世代との詳細比較
            </h3>
            <div className="space-y-6">
              {rowsForDisplay.map((row) => (
                <div key={row.subjectName}>
                  {/* 科目名 + ランク + 偏差値 */}
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                        {row.subjectName}
                      </span>
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: RANK_COLOR[row.rank] }}
                      >
                        {row.rank}
                      </span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: RANK_COLOR[row.rank], fontFamily: "var(--font-noto-serif-jp), serif" }}>
                      偏差値 {row.dev}
                    </span>
                  </div>
                  {/* スライダー比較 */}
                  <SubjectComparisonSlider rank={row.rank} userScore={row.score} avgSameGen={row.avgSameGen} avgIsFallback={row.avgIsFallback} sameGenPercent={row.sameGenPercent} />
                  {/* ランク詳細 */}
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                    {row.sameGenRankText && (
                      <span className="text-xs font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                        同世代 <span style={{ color: RANK_COLOR[row.rank] }}>{row.sameGenRankText}</span>
                      </span>
                    )}
                    {row.allRankText && (
                      <span className="text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                        全世代 {row.allRankText}
                      </span>
                    )}
                  </div>
                  {/* コメント */}
                  {STAT_COMMENTS[row.subjectName]?.[row.rank] && (
                    <p className="mt-1 text-[11px] italic text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                      {STAT_COMMENTS[row.subjectName][row.rank]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3: あなたの特徴（2カラムグリッド） ───────────────────────── */}
        {characterReport && (
          <section id="chapter-traits" className="card-rpg mt-6 p-4 sm:p-6" ref={(el) => { sectionRefs.current["chapter-traits"] = el; }}>
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#F57550" }}>3</span>
              <h2 className="section-header text-lg">🌟 あなたの特徴</h2>
            </div>

            <h3 className="mb-3 text-sm font-bold text-[#43756B]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              💪 強みと才能
            </h3>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {characterReport.strengths.map((s) => (
                <div
                  key={s.title}
                  className="rounded-xl p-4"
                  style={{ borderLeft: "4px solid #43756B", background: "#F7FAF9" }}
                >
                  <p className="mb-1.5 flex items-start gap-1.5 font-bold text-[#43756B]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 13 }}>
                    <span className="shrink-0 mt-0.5">✅</span>
                    {s.title}
                  </p>
                  <p className="text-xs text-[#555555]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.8 }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="mb-3 text-sm font-bold text-[#F57550]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              ⚠️ 抱えやすい悩みと罠
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {characterReport.traps.map((t) => (
                <div
                  key={t.title}
                  className="rounded-xl p-4"
                  style={{ borderLeft: "4px solid #F57550", background: "#FFF8F5" }}
                >
                  <p className="mb-1.5 flex items-start gap-1.5 font-bold text-[#F57550]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 13 }}>
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    {t.title}
                  </p>
                  <p className="text-xs text-[#555555]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.8 }}>
                    {t.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 4: 進化するための道筋 ────────────────────────────────────── */}
        <section id="chapter-evolution" className="card-rpg mt-6 p-4 sm:p-6" ref={(el) => { sectionRefs.current["chapter-evolution"] = el; }}>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#F57550" }}>4</span>
            <h2 className="section-header text-lg">🗺️ 進化するための道筋</h2>
          </div>
          <p className="mb-5 text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            あなたが目指せる次の姿と、今から動き出すための行動計画
          </p>

          {evolutionPaths.isSummit ? (
            <div className="rounded-xl p-4 text-center" style={{ background: "#F7FAF9", border: "1.5px solid #43756B" }}>
              <p className="text-sm font-bold text-[#43756B]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>🏆 すでに全ての頂点に立っています</p>
              <p className="mt-2 text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.8 }}>
                現在の水準を維持するために、習慣・人間関係・健康管理を定期的に見直しましょう。
              </p>
            </div>
          ) : (
            <>
              {/* 進化先カード（コンパクト） */}
              {evolutionPaths.upgrades.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 text-xs font-bold text-[#43756B]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>▼ 改善するとなれるキャラクター</p>
                  <div className="divide-y divide-[#E8DDD0] rounded-xl border border-[#E8DDD0] overflow-hidden">
                    {evolutionPaths.upgrades.map((path) => {
                      const isPriority = path.dimension === weakestAxis.label;
                      return (
                        <div key={path.dimension} className="flex items-center gap-3 bg-white px-4 py-3" style={isPriority ? { background: "#FFFDF5" } : {}}>
                          <img src={path.target.imagePath} alt={path.target.name} className="shrink-0 object-contain rounded-lg bg-white"
                            style={{ width: 48, height: 48, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.10))" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                                {path.icon} {path.dimension}を改善すると…
                              </p>
                              {isPriority && (
                                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "#FFF3ED", color: "#F57550" }}>
                                  最優先
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-[#43756B] truncate" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 14 }}>
                              {path.target.name} に進化できます
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 転落先カード（コンパクト） */}
              {evolutionPaths.downgrades.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 text-xs font-bold text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>▼ この軸が悪化すると転落するリスク</p>
                  <div className="divide-y divide-[#E8DDD0] rounded-xl border border-[#E8DDD0] overflow-hidden">
                    {evolutionPaths.downgrades.map((path) => (
                      <div key={path.dimension} className="flex items-center gap-3 bg-white px-4 py-3">
                        <img src={path.target.imagePath} alt={path.target.name} className="shrink-0 object-contain rounded-lg bg-white"
                          style={{ width: 48, height: 48, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.10))", opacity: 0.75 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                            {path.icon} {path.dimension}が悪化すると…
                          </p>
                          <p className="font-bold text-[#9A9290] truncate" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 14 }}>
                            {path.target.name} に転落するリスクがあります
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* あなたの最優先課題（axisNotes） */}
              {characterReport?.axisNotes && (
                <div className="mb-6 overflow-hidden rounded-xl border border-[#E8DDD0]">
                  <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#FFF3ED" }}>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#F57550" }}>最優先課題</span>
                    <p className="text-xs font-bold text-[#F57550]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                      {weakestAxis.icon} {weakestAxis.label}の改善
                    </p>
                  </div>
                  <div className="bg-white px-4 py-3">
                    <p className="text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.8 }}>
                      {characterReport.axisNotes[weakestAxisNoteKey]}
                    </p>
                  </div>
                </div>
              )}

              {/* キャラ固有の行動計画タイムライン */}
              {characterReport?.advice && (
                <div>
                  <p className="mb-3 text-xs font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>📋 あなたへの行動計画</p>
                  <div className="rounded-xl border border-[#E8DDD0] overflow-hidden">
                    <div className="relative px-5 py-4" style={{ background: "#FAFAF8" }}>
                      <div className="absolute left-[20px] top-5 bottom-5 w-0.5 bg-[#E8DDD0]" />
                      {[
                        { label: "今週やること", value: characterReport.advice.now, color: "#F57550" },
                        { label: "1ヶ月でやること", value: characterReport.advice.oneMonth, color: "#FFB84E" },
                        { label: "3ヶ月でやること", value: characterReport.advice.threeMonths, color: "#43756B" },
                        { label: "1年後の目標", value: characterReport.advice.oneYear, color: "#6B66A3" },
                      ].map((step) => (
                        <div key={step.label} className="relative mb-5 last:mb-0 pl-5">
                          <div className="absolute -left-[9px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: step.color, boxShadow: `0 0 0 2px ${step.color}40` }} />
                          <p className="mb-1 text-xs font-bold" style={{ color: step.color, fontFamily: "var(--font-noto-serif-jp), serif" }}>{step.label}</p>
                          <p className="text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.8 }}>{step.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Section 5: 相性診断 ──────────────────────────────────────────────── */}
        {characterReport && (
          <section id="chapter-compatibility" className="card-rpg mt-6 p-4 sm:p-6" ref={(el) => { sectionRefs.current["chapter-compatibility"] = el; }}>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#F57550" }}>5</span>
              <h2 className="section-header text-lg">🤝 相性診断</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: "best" as const, label: "最高の相性", emoji: "💚", borderColor: "#43756B", bgColor: "#F7FAF9", labelColor: "#43756B" },
                { key: "growth" as const, label: "成長できる相手", emoji: "✨", borderColor: "#FFB84E", bgColor: "#FFFBF4", labelColor: "#B8860B" },
                { key: "caution" as const, label: "要注意な相性", emoji: "⚡", borderColor: "#F57550", bgColor: "#FFF8F5", labelColor: "#F57550" },
              ].map(({ key, label, emoji, borderColor, bgColor, labelColor }) => {
                const compat = characterReport.compatibility[key];
                const compatChar = getCharacterResult(compat.characterId);
                return (
                  <div key={key} className="rounded-xl p-4" style={{ border: `1.5px solid ${borderColor}`, background: bgColor }}>
                    <p className="mb-3 text-xs font-bold" style={{ color: labelColor, fontFamily: "var(--font-noto-serif-jp), serif" }}>{emoji} {label}</p>
                    <div className="flex items-center gap-3">
                      <img src={compatChar.imagePath} alt={compat.name} className="shrink-0 object-contain rounded-lg bg-white"
                        style={{ width: 60, height: 60, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.10))" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div>
                        <p className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 14 }}>{compat.name}</p>
                        <p className="mt-1 text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.7 }}>{compat.reason}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Section 6: 無料相談 LINE CTA ─────────────────────────────────────── */}
        {characterReport && (
          <section className="card-rpg mt-6 overflow-hidden">
            <div className="px-5 py-5 text-center" style={{ background: "#06C755", boxShadow: "0 4px 20px rgba(6,199,85,0.40)", fontFamily: "var(--font-noto-serif-jp), serif", color: "white" }}>
              <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>完全無料・今すぐ相談できます</p>
              <h2 className="mt-1 text-base font-bold" style={{ color: "white" }}>
                次なる自分を目指すための<br />無料個別相談
              </h2>
            </div>
            <div className="p-5">
              <p className="mb-4 text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.9 }}>
                {characterReport.ctaMessage}
              </p>
              <div className="mb-5 rounded-xl border border-[#E8DDD0] p-4 space-y-2">
                {[
                  "📌 あなたの診断結果を一緒に深掘りする",
                  "🗺️ 進化するための優先順位を整理する",
                  "📅 具体的な行動計画を一緒に立てる",
                  "💬 日々の悩みや疑問にLINEで答える",
                ].map((item) => (
                  <p key={item} className="text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{item}</p>
                ))}
              </div>
              <a
                href="https://lin.ee/3nGM5xuo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-3 rounded-xl py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:brightness-110"
                style={{ background: "#06C755", boxShadow: "0 4px 20px rgba(6,199,85,0.40)", fontFamily: "var(--font-noto-serif-jp), serif" }}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white shrink-0" aria-hidden="true">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                今すぐ無料で相談する
              </a>
              <p className="mt-3 text-center text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                LINEを追加して、メッセージを送るだけで相談できます
              </p>
            </div>
          </section>
        )}

        <div className="mt-10 flex justify-center">
          <Link href={`/life-exam/result/${id}`} className="btn-rpg-main">
            結果ページに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
