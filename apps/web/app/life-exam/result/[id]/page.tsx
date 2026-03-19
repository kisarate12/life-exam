"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { LifeExamAttempt, LifeExamProfile, LifeExamScore, LifeExamSubject, LifeExamAnswer, LifeExamQuestion } from "@/lib/life-exam/types";
import { getJudgement, getRankFromDeviation } from "@/lib/life-exam/judgement";
import { provisionalDeviationValue, deviationFromPopulation } from "@/lib/life-exam/constants";
import { SUBJECT_DISPLAY_SHORT } from "@/lib/life-exam/ver1-concepts";
import { EXAM_V2_SUBJECT_MAX_POINTS } from "@/lib/life-exam/examV2Questions";
import type { SubjectCode } from "@/lib/life-exam/examV2Questions";
import type { JudgementRank } from "@/lib/life-exam/judgement";
import { RANK_FILL_PERCENT, RANK_COLOR } from "@/lib/life-exam/rankConstants";
import { getQuestDifficulty } from "@/lib/life-exam/questConstants";
import { getWorldLabelDisplay, getWorldDisplay, getWorldShort } from "@/lib/life-exam/worldDisplay";
import { runDiagnosis, lifeStatsFromExamRanks, getEvolutionMapInfo, SUMMIT_MESSAGE } from "@/lib/life-diagnosis";
import type { Rank } from "@/lib/life-diagnosis";
import Nav from "../../../components/Nav";
import { StatusRadarChart } from "./StatusRadarChart";

/** ランキング1件のデータ構造（UI用。DBは life_exam_ranking_entries） */
export interface RankingEntry {
  nickname: string;
  totalScore: number;
  world: string;
  character: string;
  characterImage: string;
  attemptId?: string;
}
const STAT_ORDER_ANALYSIS = ["資産", "収入", "時間", "人間関係", "健康"] as const;

const LOADING_MESSAGES = [
  "あなたの人生を分析中...",
  "5つの資本を計算しています...",
  "全国データと照合中...",
  "偏差値を算出中...",
  "あなたのキャラクターを判定中...",
  "もうすぐ結果が出ます...",
];

/** ステータスコメント（全ランクS〜F。C以下は一言評価のみ） */
const STAT_COMMENTS: Record<string, Record<JudgementRank, string>> = {
  資産: {
    S: "資産は完璧。お金に一生困らない盤石な基盤を築いています",
    A: "素晴らしい資産水準。このまま維持・拡大を続けましょう",
    B: "安定した資産があります。次のステージへの土台は整っています",
    C: "資産形成はこれから。仕組みづくりが次の課題です",
    D: "資産の土台がまだ薄い状態です",
    E: "資産がほぼない状態。早急な対応が必要です",
    F: "資産ゼロの危機的状況です",
  },
  収入: {
    S: "収入は最高水準。稼ぐ力は本物です",
    A: "高い収入を誇ります。市場価値が高い証拠です",
    B: "安定した収入があります。次は資産への転換を考えましょう",
    C: "収入を上げる余地があります",
    D: "収入が厳しい状況です",
    E: "収入が非常に低い状態です",
    F: "収入がほぼない状態です",
  },
  時間: {
    S: "時間は完全に自由。人生の主導権を握っています",
    A: "十分な自由時間があります。人生を豊かに使えています",
    B: "時間にある程度の余裕があります。うまくコントロールできています",
    C: "時間がギリギリの状態です",
    D: "時間に追われています",
    E: "時間がほぼない危機的状況です",
    F: "時間が完全に枯渇しています",
  },
  人間関係: {
    S: "人間関係は最高水準。豊かなつながりが人生を支えています",
    A: "素晴らしい人間関係。信頼できる人に恵まれています",
    B: "安定した人間関係があります。大切なつながりを育てましょう",
    C: "人間関係にやや課題があります",
    D: "孤立が進んでいる状態です",
    E: "人間関係がほぼない状態です",
    F: "完全に孤立している状態です",
  },
  健康: {
    S: "健康は完璧。すべての活動の土台が整っています",
    A: "素晴らしい健康状態。この状態を維持し続けましょう",
    B: "健康は安定しています。小さな習慣を積み重ねましょう",
    C: "健康にやや不安があります",
    D: "健康が危うい状態です",
    E: "健康状態が深刻です",
    F: "健康が限界に近い状態です",
  },
};

const QUEST_ADVICE: Record<string, Record<string, string>> = {
  資産: {
    C: "収入の10〜20%を自動的に投資口座へ移す仕組みを作りましょう。意志力に頼らない仕組みが資産形成の第一歩です。",
    D: "毎月の固定費を書き出して、削れるものを1つ見つけましょう。小さな削減が積み重なって大きな資産になります。",
    E: "今月中に家計の現状を把握することから始めましょう。何が入って何が出ているかを知ることが、すべての出発点です。",
    F: "今月中に家計の現状を把握することから始めましょう。何が入って何が出ているかを知ることが、すべての出発点です。",
  },
  収入: {
    C: "今の市場での自分の価値を確認しましょう。転職サイトに登録するだけでも、自分の相場が見えてきます。",
    D: "収入を上げるために何が足りないかを具体的に言語化しましょう。スキルなのか、経験なのか、人脈なのか。",
    E: "収入ゼロの状態が何ヶ月続くか計算してみましょう。その数字が、今すぐ動く理由になります。",
    F: "収入ゼロの状態が何ヶ月続くか計算してみましょう。その数字が、今すぐ動く理由になります。",
  },
  時間: {
    C: "今週のスケジュールを見直して、やめられることを1つ見つけましょう。時間は作るものではなく、削るものです。",
    D: "自分の時間を奪っている最大の原因を1つ特定しましょう。仕事・人・習慣、どれかに必ず答えがあります。",
    E: "時間がない状態は、人生の主導権を失っているサインかもしれません。何かを手放す決断が必要な時期です。",
    F: "時間がない状態は、人生の主導権を失っているサインかもしれません。何かを手放す決断が必要な時期です。",
  },
  人間関係: {
    C: "久しぶりに会いたい人に、今日連絡を送ってみましょう。人間関係は放置すると静かに消えていきます。",
    D: "自分が心地よくいられるコミュニティを1つ探してみましょう。オンラインでも、趣味でも、どこからでも大丈夫です。",
    E: "孤独は健康にも経済にも影響を与えます。まず1人、信頼できる人とのつながりを取り戻すことから始めましょう。",
    F: "孤独は健康にも経済にも影響を与えます。まず1人、信頼できる人とのつながりを取り戻すことから始めましょう。",
  },
  健康: {
    C: "今夜の睡眠時間を30分増やしてみましょう。健康のリターンは、どんな投資よりも高いものです。",
    D: "週2回、20分の散歩から始めましょう。運動習慣は小さく始めるほど長続きします。",
    E: "健康を後回しにしてきた時間の分、心と体は正直に反応しています。今すぐ医療機関に相談しましょう。",
    F: "健康を後回しにしてきた時間の分、心と体は正直に反応しています。今すぐ医療機関に相談しましょう。",
  },
};
/** ランクがEまたはFの場合はE・F用のアドバイスを返す（同一テキストで登録済み） */
function getQuestAdvice(subject: string, rank: JudgementRank): string {
  return QUEST_ADVICE[subject]?.[rank] ?? "";
}

/** LINE誘導セクション：キャラクター別の一言（診断結果に応じて表示） */
const LINE_CHARACTER_MESSAGE: Record<string, string> = {
  "アマテラスオオミカミ": "さらなる高みを目指すあなたに、最適な情報をお届けします",
  "大将軍": "資産形成の次のステップを、一緒に考えましょう",
  "獅子": "健康か人間関係の課題、専門家と一緒に解決しませんか",
  "カイコ": "孤独からの脱出を、一緒に考えましょう",
  "ツクヨミ": "自由な時間をさらに豊かにする方法をご紹介します",
  "下流貴族": "収入を上げるための具体的な方法を一緒に考えましょう",
  "亀": "健康か人間関係の課題、専門家と一緒に解決しませんか",
  "カタツムリ": "まず一歩、一緒に踏み出しませんか",
  "ドワーフの王": "時間を作るための具体的な方法を一緒に考えましょう",
  "騎士": "激務から抜け出すための選択肢を一緒に考えましょう",
  "タヌキ": "仕事と健康・人間関係のバランスを取り戻しませんか",
  "フンコロガシ": "お金以外の豊かさを、一緒に考えましょう",
  "ゴブリンキング": "資産を増やすための第一歩を一緒に踏み出しませんか",
  "農奴": "収入を上げるための具体的な選択肢をご紹介します",
  "ハイエナ": "今の状況を変えるための選択肢を一緒に考えましょう",
  "蚊": "まず一歩、何でも相談してください",
};
/** LINE公式URL（記録なしで開く場合のフォールバック） */
const LINE_OFFICIAL_URL = "https://lin.ee/3nGM5xuo";
/** LINE誘導用リダイレクトAPI（クリック時に attempt_id / user_id をDBに記録してからLINEへ飛ぶ） */
function getLineRedirectUrl(attemptId: string, characterName: string, world: string): string {
  const params = new URLSearchParams({ attempt_id: attemptId });
  if (characterName) params.set("character_name", characterName);
  if (world) params.set("world", world);
  return `/api/life-exam/line-redirect?${params.toString()}`;
}

/** 結果ページ用・短い教科名 */
function getSubjectNameShort(code: string): string {
  return SUBJECT_DISPLAY_SHORT[code] ?? code;
}

/** 科目スコア(0-100)から科目別偏差値（暫定）を算出 */
function subjectDeviationFromScore(score: number): number {
  return Math.round(provisionalDeviationValue(score * 5) * 10) / 10;
}

/** 順位(1=最高)と母数から「上位〇%」または「下位〇%」を返す。50%未満は上位、50%以上は下位。下位は「上からX%」の逆で 1-X を表示（上から70%→下位30%） */
function formatPercentile(rank: number, total: number): string {
  if (total <= 0) return "—";
  const pctFromTop = (rank / total) * 100;
  if (pctFromTop < 50) {
    const display = pctFromTop < 1 ? pctFromTop.toFixed(2) : pctFromTop >= 100 ? "100" : Math.round(pctFromTop).toString();
    return `上位${display}%`;
  }
  const pctFromBottom = ((total - rank) / total) * 100;
  const display = pctFromBottom < 1 ? pctFromBottom.toFixed(2) : pctFromBottom >= 100 ? "100" : Math.round(pctFromBottom).toString();
  return `下位${display}%`;
}

/** 人生レベルの表示色（S〜F）— デザイントークンの grade 色 */
function getRankColorClass(rank: JudgementRank): string {
  switch (rank) {
    case "S": return "grade-s";
    case "A": return "grade-a";
    case "B": return "grade-b";
    case "C": return "grade-c";
    case "D": return "grade-d";
    case "E": return "grade-e";
    case "F": return "grade-f";
    default: return "text-[var(--foreground)]";
  }
}

/** ランク→星の数（カードゲームUI用）S=7〜F=1 */
const RANK_STAR_COUNT: Record<JudgementRank, number> = {
  S: 7,
  A: 6,
  B: 5,
  C: 4,
  D: 3,
  E: 2,
  F: 1,
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

/** ステータス行用：filledCount 個をゴールド、残りを未達成で表示（最大7） */
function StatStars({ filledCount }: { filledCount: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <StarIcon key={i} filled={i < filledCount} />
      ))}
    </span>
  );
}

/** 凡例用：ランク色で星を表示 */
const LEGEND_STAR_COLOR: Record<JudgementRank, string> = {
  S: "#FFB84E",
  A: "#FFB84E",
  B: "#FFB84E",
  C: "#FFB84E",
  D: "#FFB84E",
  E: "#FFB84E",
  F: "#FFB84E",
};
function LegendStars({ rank }: { rank: JudgementRank }) {
  const count = RANK_STAR_COUNT[rank];
  const color = LEGEND_STAR_COLOR[rank];
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} width={STAR_SIZE} height={STAR_SIZE} viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} />
        </svg>
      ))}
    </span>
  );
}

/** 世界バッジの背景色（白で統一・文字は紺） */
function getWorldBadgeBg(world: string): string {
  return "#FFFFFF";
}

type ComparisonRow = {
  subjectName: string;
  score: number;
  /** 表示用：元の満点換算の得点（例: 134） */
  scoreDisplay: number;
  /** 表示用：科目の満点（200 or 100） */
  maxPoints: number;
  avg: number | null;
  deviation: number;
  rank: JudgementRank;
  /** 順位表示（例: 123位 / 5500人） */
  rankText: string | null;
  percentText: string | null;
};

type TotalRow = {
  score: number;
  /** 総合の満点（表示用900） */
  maxPoints: number;
  deviation: number;
  rank: JudgementRank;
  /** 順位表示（例: 1234位 / 5500人） */
  rankText?: string | null;
  percentText?: string | null;
  /** 総合の平均（表示用・900点換算） */
  avgDisplay?: number | null;
};

/** 5科目のスコア（0-100）をレーダーチャートで表示 */
function RadarChart({ data, size = 220 }: { data: { name: string; value: number }[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.85;
  const count = data.length;

  const getPoint = (angleDeg: number, r: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const axes = data.map((_, i) => getPoint(i * (360 / count), radius));
  const dataPoints = data.map((d, i) => getPoint(i * (360 / count), (d.value / 100) * radius));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* グリッド円（25%, 50%, 75%, 100%） */}
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={data.map((_, i) => getPoint(i * (360 / count), radius * scale)).map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--card-border)"
            strokeWidth="1"
          />
        ))}
        {/* 軸線 */}
        {axes.map((p, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--card-border)"
            strokeWidth="1"
          />
        ))}
        {/* データ多角形（半透明） */}
        <polygon
          points={dataPath}
          fill="var(--brand-primary)"
          fillOpacity="0.25"
          stroke="var(--brand-primary)"
          strokeWidth="2"
        />
        {/* ラベル */}
        {data.map((d, i) => {
          const p = getPoint(i * (360 / count), radius + 14);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              className="fill-[var(--foreground)] text-[10px] font-medium"
            >
              {d.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ComparisonTable({
  rows,
  title,
  note,
  className,
  totalRow,
}: {
  rows: ComparisonRow[];
  title: string;
  note?: string;
  className?: string;
  /** 総合の行（総合点数・総合偏差値・ランク・順位） */
  totalRow?: TotalRow;
}) {
  return (
    <div className={className ? `mb-10 ${className}` : "mb-10"}>
      <h3 className="text-base font-bold text-[var(--foreground)]">{title}</h3>
      {note && <p className="mt-1 text-xs text-[#9A9290]">{note}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[320px] table-fixed border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "17%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="py-2 text-center font-medium text-[#9A9290]">科目</th>
              <th className="py-2 text-center font-medium text-[#9A9290]">あなた</th>
              <th className="py-2 text-center font-medium text-[#9A9290]">平均</th>
              <th className="py-2 text-center font-medium text-[#9A9290]">偏差値</th>
              <th className="py-2 text-center font-medium text-[#9A9290]">S〜F</th>
              <th className="py-2 text-center font-medium text-[#9A9290]">順位</th>
              <th className="py-2 text-center font-medium text-[#9A9290]">全体割合</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--card-border)]">
                <td className="py-2 text-center text-[var(--foreground)]">{row.subjectName}</td>
                <td className="py-2 text-center tabular-nums text-[var(--foreground)]">{row.scoreDisplay}/{row.maxPoints}</td>
                <td className="py-2 text-center tabular-nums text-[#9A9290]">{row.avg != null ? row.avg : "—"}</td>
                <td className="py-2 text-center tabular-nums text-[var(--foreground)]">{row.deviation}</td>
                <td className={`py-2 text-center font-medium ${getRankColorClass(row.rank)}`}>{row.rank}</td>
                <td className="py-2 text-center text-sub">{row.rankText ?? "—"}</td>
                <td className="py-2 text-center text-sub">{row.percentText ?? "—"}</td>
              </tr>
            ))}
            {totalRow && (
              <tr className="border-t-2 border-[var(--card-border)] bg-[var(--surface-subtle)]">
                <td className="py-3 text-center text-[var(--foreground)]">総合</td>
                <td className="py-3 text-center tabular-nums text-[var(--foreground)]">{totalRow.score}/{totalRow.maxPoints}</td>
                <td className="py-3 text-center tabular-nums text-[#9A9290]">{totalRow.avgDisplay != null ? totalRow.avgDisplay : "—"}</td>
                <td className="py-3 text-center tabular-nums text-[var(--foreground)]">{totalRow.deviation}</td>
                <td className={`py-3 text-center font-medium ${getRankColorClass(totalRow.rank)}`}>{totalRow.rank}</td>
                <td className="py-3 text-center text-sub">{totalRow.rankText ?? "—"}</td>
                <td className="py-3 text-center text-sub">{totalRow.percentText ?? "—"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LifeExamResultPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [attempt, setAttempt] = useState<LifeExamAttempt | null>(null);
  const [profile, setProfile] = useState<LifeExamProfile | null>(null);
  const [scores, setScores] = useState<LifeExamScore[]>([]);
  const [subjects, setSubjects] = useState<LifeExamSubject[]>([]);
  const [comparisonStats, setComparisonStats] = useState<{
    total_avg_all: number | null;
    total_stddev_all: number | null;
    total_avg_same_gen: number | null;
    total_stddev_same_gen: number | null;
    subjects: Array<{
      subject_id: number;
      avg_all: number | null;
      stddev_all: number | null;
      avg_same_gen: number | null;
      stddev_same_gen: number | null;
      rank_all: number;
      total_all: number;
      rank_same_gen: number;
      total_same_gen: number;
    }>;
  } | null>(null);
  const [answers, setAnswers] = useState<LifeExamAnswer[]>([]);
  const [questions, setQuestions] = useState<LifeExamQuestion[]>([]);
  const [questionStats, setQuestionStats] = useState<Array<{
    question_id: number;
    user_score: number | null;
    avg_all: number | null;
    stddev_all: number | null;
    rank_all: number;
    total_all: number;
  }>>([]);
  const [characterImageError, setCharacterImageError] = useState(false);
  const [analysisImageErrors, setAnalysisImageErrors] = useState<Record<string, boolean>>({});
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

      if (attemptRow.user_id) {
        const { data: profileData } = await supabase
          .from("life_exam_profiles")
          .select("*")
          .eq("user_id", attemptRow.user_id)
          .maybeSingle();
        setProfile((profileData as LifeExamProfile) ?? null);
      }

      const { data: statsData } = await supabase.rpc("get_life_exam_comparison_stats", { p_attempt_id: id });
      if (statsData && typeof statsData === "object" && "subjects" in statsData) {
        const st = statsData as {
          total_avg_all?: number | null;
          total_stddev_all?: number | null;
          total_avg_same_gen?: number | null;
          total_stddev_same_gen?: number | null;
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
        setComparisonStats({
          total_avg_all: st.total_avg_all ?? null,
          total_stddev_all: st.total_stddev_all ?? null,
          total_avg_same_gen: st.total_avg_same_gen ?? null,
          total_stddev_same_gen: st.total_stddev_same_gen ?? null,
          subjects: Array.isArray(st.subjects)
            ? st.subjects.map((sub) => ({
                subject_id: sub.subject_id,
                avg_all: sub.avg_all ?? null,
                stddev_all: sub.stddev_all ?? null,
                avg_same_gen: sub.avg_same_gen ?? null,
                stddev_same_gen: sub.stddev_same_gen ?? null,
                rank_all: sub.rank_all,
                total_all: sub.total_all,
                rank_same_gen: sub.rank_same_gen,
                total_same_gen: sub.total_same_gen,
              }))
            : [],
        });
      }

      const [
        { data: answersData },
        { data: questionsData },
        { data: questionStatsData },
      ] = await Promise.all([
        supabase.from("life_exam_answers").select("question_id, value_numeric").eq("attempt_id", id),
        supabase.from("life_exam_questions").select("id, subject_id, sort_order, label").order("subject_id").order("sort_order"),
        supabase.rpc("get_life_exam_question_stats", { p_attempt_id: id }),
      ]);
      setAnswers((answersData as LifeExamAnswer[]) ?? []);
      setQuestions((questionsData as LifeExamQuestion[]) ?? []);
      setQuestionStats(Array.isArray(questionStatsData) ? questionStatsData : []);

      if (scoresErr) setError(scoresErr.message);
      setLoading(false);
    })();
  }, [id]);

  /** ランキング用に今回の受験を登録してから順位取得（同世界ランキングが常に1位になるのを防ぐ） */
  useEffect(() => {
    if (!id || !attempt || !scores.length || !subjects.length) return;
    const scoreBySubject: Record<number, number> = {};
    scores.forEach((row) => {
      scoreBySubject[row.subject_id] = Number(row.score);
    });
    const rankBySubjectId: Record<number, Rank> = {};
    subjects.forEach((s) => {
      const score = scoreBySubject[s.id] ?? 50;
      const dev = subjectDeviationFromScore(score);
      rankBySubjectId[s.id] = getRankFromDeviation(dev) as Rank;
    });
    const stats = lifeStatsFromExamRanks(rankBySubjectId);
    const characterResult = runDiagnosis(stats);
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
      if (err) {
        console.error("[ランキング取得エラー]", err);
        return;
      }
      const raw = data as { global_rank?: number; global_total?: number; world_stats?: Record<string, { rank: number; total: number }> } | null;
      if (!raw) return;
      setRankingStats({
        globalRank: raw.global_rank ?? 0,
        globalTotal: raw.global_total ?? 0,
        worldStats: raw.world_stats ?? {},
      });
    })();
  }, [attempt, scores, subjects, id]);

  if (loading) {
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

  const totalScore = Number(attempt.total_score);
  /** 偏差値：母集団の平均・標準偏差がある場合は z-score（50+10*(x-μ)/σ）、なければ保存値または暫定式 */
  const deviation =
    deviationFromPopulation(
      totalScore,
      comparisonStats?.total_avg_all ?? null,
      comparisonStats?.total_stddev_all ?? null
    ) ?? (Number(attempt.deviation_value) || provisionalDeviationValue(totalScore));
  const { rank } = getJudgement(deviation);

  /** 同世代の偏差値（表示用・比較統計がある場合のみ） */
  const deviationSameGenForDisplay =
    comparisonStats?.total_avg_same_gen != null && comparisonStats?.total_stddev_same_gen != null
      ? deviationFromPopulation(
          totalScore,
          comparisonStats.total_avg_same_gen,
          comparisonStats.total_stddev_same_gen
        )
      : null;
  /** 先頭表示・診断・シェア用：同世代の偏差値・ランクを優先 */
  const displayDeviation =
    deviationSameGenForDisplay != null ? Math.round(deviationSameGenForDisplay * 10) / 10 : deviation;
  const displayRank =
    deviationSameGenForDisplay != null ? getRankFromDeviation(deviationSameGenForDisplay) : rank;

  /** 総合行の全体割合（上位〇% / 下位〇%） */
  const nationalPercent =
    attempt.national_rank != null && attempt.national_total != null && attempt.national_total > 0
      ? formatPercentile(attempt.national_rank, attempt.national_total)
      : null;
  const sameGenPercentText =
    attempt.same_gen_rank != null && attempt.same_gen_total != null && attempt.same_gen_total > 0
      ? formatPercentile(attempt.same_gen_rank, attempt.same_gen_total)
      : null;
  /** 総合は900点満点（200+200+200+200+100）。保存は0-500なので表示用に換算 */
  const TOTAL_MAX_DISPLAY = 900;
  const totalScoreDisplay = Math.round((totalScore / 500) * TOTAL_MAX_DISPLAY);
  const totalRow: TotalRow = {
    score: totalScoreDisplay,
    maxPoints: TOTAL_MAX_DISPLAY,
    deviation: Math.round(deviation * 10) / 10,
    rank,
    percentText: null,
  };

  /** 科目別比較用行（ベース）。偏差値は母集団の平均・標準偏差があれば z-score、なければ暫定式 */
  const comparisonRowsBase = subjectsSorted.map((s) => {
    const score = Number(scoreBySubject[s.id] ?? 0);
    const maxP = EXAM_V2_SUBJECT_MAX_POINTS[s.code as SubjectCode] ?? 100;
    const scoreDisplay = Math.round((score / 100) * maxP);
    const st = comparisonStats?.subjects?.find((x) => x.subject_id === s.id);
    const dev =
      deviationFromPopulation(score, st?.avg_all ?? null, st?.stddev_all ?? null) ??
      subjectDeviationFromScore(score);
    return {
      subjectName: getSubjectNameShort(s.code),
      subjectId: s.id,
      score,
      scoreDisplay,
      maxPoints: maxP,
      deviation: dev,
      rank: getRankFromDeviation(dev),
    };
  });

  /** 全世代比較用：平均・順位・全体割合をRPC結果で補完 */
  const comparisonRowsAll: ComparisonRow[] = comparisonRowsBase.map((row) => {
    const st = comparisonStats?.subjects?.find((x) => x.subject_id === row.subjectId);
    const avgDisplay = st?.avg_all != null ? Math.round((st.avg_all / 100) * row.maxPoints) : null;
    const percentText = st && st.total_all > 0 ? formatPercentile(st.rank_all, st.total_all) : null;
    const rankText = st && st.total_all > 0 ? `${st.rank_all}位 / ${st.total_all}人` : null;
    return {
      subjectName: row.subjectName,
      score: row.score,
      scoreDisplay: row.scoreDisplay,
      maxPoints: row.maxPoints,
      avg: avgDisplay,
      deviation: row.deviation,
      rank: row.rank,
      rankText,
      percentText,
    };
  });

  /** 同世代比較用：同世代の平均・標準偏差で偏差値・S〜Fを算出し、順位・全体割合も同世代で表示 */
  const comparisonRowsSameGen: ComparisonRow[] = comparisonRowsBase.map((row) => {
    const st = comparisonStats?.subjects?.find((x) => x.subject_id === row.subjectId);
    const devSameGen =
      deviationFromPopulation(row.score, st?.avg_same_gen ?? null, st?.stddev_same_gen ?? null) ?? row.deviation;
    const rankSameGen = getRankFromDeviation(devSameGen);
    const avgDisplay = st?.avg_same_gen != null ? Math.round((st.avg_same_gen / 100) * row.maxPoints) : null;
    const percentText = st && st.total_same_gen > 0 ? formatPercentile(st.rank_same_gen, st.total_same_gen) : null;
    const rankText = st && st.total_same_gen > 0 ? `${st.rank_same_gen}位 / ${st.total_same_gen}人` : null;
    return {
      subjectName: row.subjectName,
      score: row.score,
      scoreDisplay: row.scoreDisplay,
      maxPoints: row.maxPoints,
      avg: avgDisplay,
      deviation: devSameGen,
      rank: rankSameGen,
      rankText,
      percentText,
    };
  });

  /** 総合行（全世代・同世代で平均・順位・全体割合を付与） */
  const totalRowAll: TotalRow = {
    ...totalRow,
    rankText:
      attempt.national_rank != null && attempt.national_total != null && attempt.national_total > 0
        ? `${attempt.national_rank}位 / ${attempt.national_total}人`
        : null,
    percentText: nationalPercent,
    avgDisplay:
      comparisonStats?.total_avg_all != null
        ? Math.round((comparisonStats.total_avg_all / 500) * TOTAL_MAX_DISPLAY)
        : null,
  };
  /** 総合の偏差値・S〜Fを同世代母集団で再計算（同世代比較テーブル用） */
  const totalRowSameGen: TotalRow = {
    ...totalRow,
    deviation: deviationSameGenForDisplay != null ? displayDeviation : totalRow.deviation,
    rank: deviationSameGenForDisplay != null ? displayRank : totalRow.rank,
    rankText:
      attempt.same_gen_rank != null && attempt.same_gen_total != null && attempt.same_gen_total > 0
        ? `${attempt.same_gen_rank}位 / ${attempt.same_gen_total}人`
        : null,
    percentText: sameGenPercentText,
    avgDisplay:
      comparisonStats?.total_avg_same_gen != null
        ? Math.round((comparisonStats.total_avg_same_gen / 500) * TOTAL_MAX_DISPLAY)
        : null,
  };

  /** 同世代の科目別S〜Fからキャラクター診断（1=資産, 2=収入, 3=人間関係, 4=時間, 5=健康） */
  const rankBySubjectId: Record<number, Rank> = {};
  comparisonRowsBase.forEach((row, i) => {
    rankBySubjectId[row.subjectId] = comparisonRowsSameGen[i].rank as Rank;
  });
  const characterResult = runDiagnosis(lifeStatsFromExamRanks(rankBySubjectId));
  const evolutionMapInfo = getEvolutionMapInfo(characterResult.id);

  /** 詳細分析用：ステータス表示行・クエスト対象 */
  const rowsForAnalysis = STAT_ORDER_ANALYSIS.map((name) => {
    const sameGen = comparisonRowsSameGen.find((r) => r.subjectName === name);
    const all = comparisonRowsAll.find((r) => r.subjectName === name);
    return {
      subjectName: name,
      rank: sameGen?.rank ?? "C",
      sameGenPercent: sameGen?.percentText ?? "—",
      allPercent: all?.percentText ?? "—",
      sameGenRankText: sameGen?.rankText ?? "—",
    };
  });
  const questItemsForAnalysis = rowsForAnalysis.filter((r) => ["C", "D", "E", "F"].includes(r.rank));

  const worldDisplay = getWorldDisplay(characterResult.world);
  const worldShort = getWorldShort(characterResult.world);
  const worldLabelDisplay = getWorldLabelDisplay(characterResult.world);

  /** ランキング表示用（RPC結果をそのまま使用） */
  const globalRankDisplay = rankingStats && rankingStats.globalTotal > 0
    ? `${rankingStats.globalRank}位`
    : null;
  const worldStat = rankingStats?.worldStats?.[worldShort];
  const worldRankDisplay = worldStat && worldStat.total > 0 ? `${worldStat.rank}位` : null;
  const worldTotalDisplay = worldStat?.total ?? 0;

  const rankLabel: Record<JudgementRank, string> = {
    S: "圧倒的上位",
    A: "上位",
    B: "準上位",
    C: "平均",
    D: "下位",
    E: "要改善",
    F: "危険水域",
  };
  const distributionPosition = Math.min(100, Math.max(0, displayDeviation));
  const resultUrl = typeof window !== "undefined" ? `${window.location.origin}/life-exam/result/${id}` : "";
  const shareModalCardFooter = (
    <div className="mt-4 border-t border-[#E8DDD0] pt-3 text-center">
      <p className="text-[#D0C8C0]" style={{ fontSize: 11 }}>{resultUrl}</p>
      <p className="mt-1 text-[#D0C8C0]" style={{ fontSize: 11 }}>#人生診断</p>
    </div>
  );
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
  const handleShareInstagram = () => {
    handleDownloadCard();
  };
  const handleShareTikTok = () => {
    handleDownloadCard();
  };
  const shareXUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`私は「${characterResult.name}」でした！\n世界：${worldDisplay.name}\n総合点：${totalScoreDisplay}点\n#人生診断\n${resultUrl}`)}`;
  const shareLineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(resultUrl)}&text=${encodeURIComponent(`私は「${characterResult.name}」でした！#人生診断`)}`;

  return (
    <div className="min-h-screen relative z-10">
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
          {/* キャラカード全体が収まるエリア */}
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
                <h2 className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: "1.5rem" }}>{characterResult.name}</h2>
              </div>
              <div className="text-center" style={{ marginBottom: 16 }}>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontWeight: 400 }}>{characterResult.description}</p>
              </div>
              <div className="border-t border-[#E8DDD0] pt-4">
                {[
                  { label: "収入", rank: comparisonRowsSameGen.find((r) => r.subjectName === "収入")?.rank ?? "C" },
                  { label: "資産", rank: comparisonRowsSameGen.find((r) => r.subjectName === "資産")?.rank ?? "C" },
                  { label: "健康", rank: comparisonRowsSameGen.find((r) => r.subjectName === "健康")?.rank ?? "C" },
                  { label: "人間関係", rank: comparisonRowsSameGen.find((r) => r.subjectName === "人間関係")?.rank ?? "C" },
                  { label: "時間", rank: comparisonRowsSameGen.find((r) => r.subjectName === "時間")?.rank ?? "C" },
                ].map(({ label, rank }) => (
                  <div key={label} className="flex items-center justify-between py-2 text-sm" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                    <span className="text-[#333333]">{label}</span>
                    <StatStars filledCount={RANK_STAR_COUNT[rank]} />
                  </div>
                ))}
              </div>
              {shareModalCardFooter}
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
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        {/* 診断結果（カード） */}
        <section className="card-rpg p-4 sm:p-6">
          <div className="font-diagnosis-card mx-auto max-w-sm overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-white p-8 shadow-[var(--shadow-card)]" style={{ borderColor: "#E8DDD0" }}>
            {/* 世界名 */}
            <div
              className="text-center rounded-xl border border-[#E8DDD0] bg-white py-3 px-4"
              style={{
                marginBottom: 16,
                borderLeft: "4px solid #F57550",
              }}
            >
              <span className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                {worldLabelDisplay}
              </span>
            </div>
            {/* キャラクター画像（最大240px・ドロップシャドウ） */}
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
                  <div
                    className="flex h-40 w-40 items-center justify-center rounded-xl border border-[#E8DDD0] bg-white text-sub text-sm"
                    aria-hidden
                  >
                    画像を配置
                  </div>
                )}
              </div>
            </div>
            {/* キャラクター名 */}
            <div className="text-center" style={{ marginBottom: 16 }}>
              <h2 className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: "1.5rem" }}>
                {characterResult.name}
              </h2>
            </div>
            {/* 説明文 */}
            <div className="text-center" style={{ marginBottom: 16 }}>
              <p
                className="whitespace-pre-line text-sm leading-relaxed text-[#333333]"
                style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontWeight: 400 }}
              >
                {characterResult.description}
              </p>
            </div>
            {/* 5ステータス・星（space-between） */}
            <div className="border-t border-[#E8DDD0] pt-4">
              {[
                { label: "収入", rank: comparisonRowsSameGen.find((r) => r.subjectName === "収入")?.rank ?? "C" },
                { label: "資産", rank: comparisonRowsSameGen.find((r) => r.subjectName === "資産")?.rank ?? "C" },
                { label: "健康", rank: comparisonRowsSameGen.find((r) => r.subjectName === "健康")?.rank ?? "C" },
                { label: "人間関係", rank: comparisonRowsSameGen.find((r) => r.subjectName === "人間関係")?.rank ?? "C" },
                { label: "時間", rank: comparisonRowsSameGen.find((r) => r.subjectName === "時間")?.rank ?? "C" },
              ].map(({ label, rank }) => (
                <div key={label} className="flex items-center justify-between py-2 text-sm" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  <span className="text-[#333333]">{label}</span>
                  <StatStars filledCount={RANK_STAR_COUNT[rank]} />
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

        {/* 世界戦闘力（簡易表示） */}
        <section className="card-rpg mt-6 p-4 sm:p-6">
          <h2 className="section-header mb-4 text-lg">
            世界戦闘力
          </h2>

          <p
            className="mb-2 text-2xl font-bold text-[#333333]"
            style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}
          >
            戦闘力：{totalScoreDisplay.toLocaleString("ja-JP")} / {TOTAL_MAX_DISPLAY.toLocaleString("ja-JP")}
          </p>
          <div
            className="mb-6 h-3 w-full overflow-hidden rounded-full"
            style={{ background: "rgba(245,117,80,0.2)" }}
          >
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

        {/* 詳細分析：あなたのステータス・クエスト・進化ロードマップ */}
        <section className="card-rpg mt-6 p-4 sm:p-6">
          <h2 className="section-header mb-4 text-lg">
            ⚔️ あなたのステータス
          </h2>
          <div className="mb-6 flex justify-center">
            <StatusRadarChart rows={rowsForAnalysis} />
          </div>
          <div className="divide-y divide-[#E8DDD0]">
            {rowsForAnalysis.map((row) => (
              <div
                key={row.subjectName}
                className="py-3 first:pt-0 last:pb-0"
                style={{ minHeight: 80 }}
              >
                {/* 1行目：ステータス名 ＋ ランク ＋ ゴールドバー（幅を揃えて開始位置を一致） */}
                <div className="flex items-center gap-2">
                  <span
                    className="shrink-0 font-bold text-[#333333]"
                    style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontWeight: 700, fontSize: 16, minWidth: "5em" }}
                  >
                    {row.subjectName}
                  </span>
                  <span
                    className="shrink-0 font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-noto-serif-jp), serif",
                      fontSize: 16,
                      width: "1.2em",
                      textAlign: "center",
                      color: RANK_COLOR[row.rank],
                    }}
                  >
                    {row.rank}
                  </span>
                  <div className="min-h-[10px] min-w-0 flex-1 overflow-hidden rounded" style={{ background: "rgba(245,117,80,0.2)" }}>
                    <div
                      className="h-full rounded transition-[width]"
                      style={{ width: `${RANK_FILL_PERCENT[row.rank]}%`, background: "linear-gradient(90deg, #FFB84E, #F57550)", minHeight: 10 }}
                    />
                  </div>
                </div>
                {/* 2行目：同世代 上位○% ／ 全世代 上位○% */}
                <p className="mt-1 text-left text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  同世代 {row.sameGenPercent}　全世代 {row.allPercent}
                </p>
                {/* 3行目：コメント（全ランク） */}
                {STAT_COMMENTS[row.subjectName]?.[row.rank] && (
                  <p
                    className="mt-1 text-left italic"
                    style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 12, color: "#9A9290", marginTop: 4 }}
                  >
                    {STAT_COMMENTS[row.subjectName][row.rank]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* クエストセクション（RPG掲示板風） */}
        <section className="card-rpg mt-6 p-4 sm:p-6">
          <h2 className="section-header mb-4 text-lg">
            📜 クエスト
          </h2>
          {questItemsForAnalysis.length === 0 ? (
            <p className="text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>現在クリアすべきクエストはありません！</p>
          ) : (
            <div className="space-y-5">
              {questItemsForAnalysis.map((row) => {
                const difficulty = getQuestDifficulty(row.subjectName, row.rank);
                return (
                  <article
                    key={row.subjectName}
                    className="overflow-hidden rounded-xl transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(245,117,80,0.12)]"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #F57550",
                      borderRadius: 12,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ padding: "18px 20px" }}>
                      <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 12 }}>
                        <p
                          className="font-bold m-0"
                          style={{
                            fontFamily: "var(--font-noto-serif-jp), serif",
                            fontSize: 15,
                            color: "#333333",
                          }}
                        >
                          {row.subjectName} <span style={{ color: "#9A9290", fontWeight: 600 }}>ランク{row.rank}</span>
                        </p>
                        {difficulty && (
                          <span
                            className="font-bold shrink-0"
                            style={{
                              fontFamily: "var(--font-noto-serif-jp), serif",
                              fontSize: 11,
                              background: "transparent",
                              color: "#333333",
                              padding: "4px 10px",
                              borderRadius: 20,
                              border: "1px solid #F57550",
                            }}
                          >
                            {difficulty.label}
                          </span>
                        )}
                      </div>
                      <p
                        className="m-0"
                        style={{
                          fontFamily: "var(--font-noto-serif-jp), serif",
                          fontSize: 14,
                          lineHeight: 1.8,
                          color: "#333333",
                        }}
                      >
                        {getQuestAdvice(row.subjectName, row.rank)}
                      </p>
                      {difficulty && (
                        <p
                          className="italic m-0 mt-3 pt-3 text-[#9A9290]"
                          style={{
                            fontFamily: "var(--font-noto-serif-jp), serif",
                            fontSize: 12,
                            borderTop: "1px dashed #E8DDD0",
                          }}
                        >
                          {difficulty.desc}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="card-rpg mt-6 p-4 sm:p-6">
          <h2 className="section-header mb-4 text-lg">🗺️ 進化ロードマップ</h2>

          <div className="flex flex-col items-center gap-4">
            {/* 進化先（上）：現在のキャラクターと同じ120px */}
            {!evolutionMapInfo.isSummit && evolutionMapInfo.target && (
              <div className="flex flex-col items-center border border-[#E8DDD0] bg-white rounded-xl p-4">
                <p className="mb-2 text-xs font-bold text-[#F57550]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>進化先</p>
                <div className="flex items-center gap-3 sm:flex-row">
                  <div className="relative shrink-0 overflow-hidden rounded-lg bg-white" style={{ width: 120, height: 120 }}>
                    {!analysisImageErrors[`evo-${evolutionMapInfo.target.id}`] ? (
                      <img
                        src={evolutionMapInfo.target.imagePath}
                        alt=""
                        className="h-full w-full object-contain"
                        onError={() => setAnalysisImageErrors((e) => ({ ...e, [`evo-${evolutionMapInfo.target!.id}`]: true }))}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[#9A9290]">画像</div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{evolutionMapInfo.target.name}</p>
                    <p className="text-sm text-[#9A9290]">{getWorldLabelDisplay(evolutionMapInfo.target.world)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 進化条件：矢印（↑）24px ゴールド ＋ 条件テキスト */}
            {!evolutionMapInfo.isSummit && evolutionMapInfo.conditionText && evolutionMapInfo.target && (
              <p
                className="text-center font-medium"
                style={{ fontFamily: "var(--font-noto-serif-jp), serif", color: "#F57550", fontSize: 24 }}
              >
                ↑
              </p>
            )}
            {!evolutionMapInfo.isSummit && evolutionMapInfo.conditionText && evolutionMapInfo.target && (
              <p
                className="text-center text-sm"
                style={{ fontFamily: "var(--font-noto-serif-jp), serif", color: "#F57550" }}
              >
                {evolutionMapInfo.conditionText} → {evolutionMapInfo.target.name}に進化
              </p>
            )}

            {/* 現在のキャラクター（中央・120px） */}
            <div className="rounded-xl border border-[#E8DDD0] bg-white p-4">
              {evolutionMapInfo.isSummit && (
                <p className="mb-2 text-center text-sm font-bold text-[#F57550]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  頂点に達しています！
                </p>
              )}
              {evolutionMapInfo.isSummit && (
                <p className="mb-4 text-center text-sm text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  {SUMMIT_MESSAGE}
                </p>
              )}
                <p className="mb-2 text-xs font-bold text-[#9A9290]">現在のキャラクター</p>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0 overflow-hidden rounded-lg bg-white" style={{ width: 120, height: 120 }}>
                  {!analysisImageErrors[characterResult.id] ? (
                    <img
                      src={characterResult.imagePath}
                      alt=""
                      className="h-full w-full object-contain"
                      onError={() => setAnalysisImageErrors((e) => ({ ...e, [characterResult.id]: true }))}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#9A9290]">画像</div>
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{characterResult.name}</p>
                  <p className="text-sm text-[#9A9290]">{worldLabelDisplay}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* シェア：スクショ用 → SNSアイコンのみ */}
        <section className="card-rpg mt-6 p-6 sm:p-8">
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="btn-rpg-sub w-full py-3 text-sm"
          >
            シェア用にカードを表示する
          </button>
          <p className="mt-4 text-center text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            SNSでシェアしよう
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <a
              href={shareXUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center transition hover:opacity-70"
              aria-label="Xでシェア"
            >
              <img src="/icons/x.svg" alt="" className="h-9 w-9 shrink-0" />
            </a>
            <a
              href={shareLineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center transition hover:opacity-70"
              aria-label="LINEでシェア"
            >
              <img src="/icons/line.svg" alt="" className="h-9 w-9 shrink-0" />
            </a>
            <button
              type="button"
              onClick={handleShareInstagram}
              className="inline-flex items-center justify-center transition hover:opacity-70"
              aria-label="Instagramでシェア"
            >
              <img src="/icons/instagram.svg" alt="" className="h-9 w-9 shrink-0" />
            </button>
            <button
              type="button"
              onClick={handleShareTikTok}
              className="inline-flex items-center justify-center transition hover:opacity-70"
              aria-label="TikTokでシェア"
            >
              <img src="/icons/tiktok.svg" alt="" className="h-9 w-9 shrink-0" />
            </button>
          </div>
        </section>

        {/* LINE誘導セクション：白背景・金縁 */}
        <section
          className="mt-8 rounded-[24px] border-2 px-4 py-6 text-center md:px-6 md:py-10"
          style={{
            background: "#FFFFFF",
            borderColor: "#F57550",
          }}
        >
          <p className="mb-4 text-[48px] leading-none">💬</p>
          <h2
            className="mb-3 font-bold"
            style={{ fontSize: 24, color: "#333333" }}
          >
            あなたの課題を一緒に解決しませんか？
          </h2>
          <p
            className="mx-auto mb-6 max-w-xl"
            style={{
              fontSize: 14,
              color: "#333333",
              lineHeight: 1.8,
            }}
          >
            クエストの課題に合わせて、転職・資産形成・健康・コーチングなど最適なサポートをご紹介します
          </p>
          {LINE_CHARACTER_MESSAGE[characterResult.name] && (
            <p
              className="mx-auto mb-6 max-w-lg italic"
              style={{
                fontSize: 15,
                color: "#9A9290",
              }}
            >
              {LINE_CHARACTER_MESSAGE[characterResult.name]}
            </p>
          )}
          <a
            href={id ? getLineRedirectUrl(id, characterResult.name, characterResult.world) : LINE_OFFICIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full max-w-md rounded-lg font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 md:w-auto"
            style={{
              background: "#06C755",
              fontSize: 18,
              padding: "16px 48px",
              boxShadow: "0 4px 16px rgba(6,199,85,0.4)",
            }}
          >
            LINE で無料相談する →
          </a>
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
