"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { LifeExamAttempt, LifeExamScore, LifeExamSubject } from "@/lib/life-exam/types";
import { getRankFromDeviation } from "@/lib/life-exam/judgement";
import type { JudgementRank } from "@/lib/life-exam/judgement";
import { RANK_FILL_PERCENT, RANK_COLOR } from "@/lib/life-exam/rankConstants";
import { QUEST_DIFFICULTY, getQuestDifficulty } from "@/lib/life-exam/questConstants";
import { deviationFromPopulation, provisionalDeviationValue } from "@/lib/life-exam/constants";
import { SUBJECT_DISPLAY_SHORT } from "@/lib/life-exam/ver1-concepts";
import { runDiagnosis, lifeStatsFromExamRanks, getEvolutionMapInfo, SUMMIT_MESSAGE } from "@/lib/life-diagnosis";
import type { Rank } from "@/lib/life-diagnosis";
import Nav from "../../../../components/Nav";

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
    const display = pctFromTop < 1 ? pctFromTop.toFixed(2) : pctFromTop >= 100 ? "100" : Math.round(pctFromTop).toString();
    return `上位${display}%`;
  }
  const pctFromBottom = ((total - rank) / total) * 100;
  const display = pctFromBottom < 1 ? pctFromBottom.toFixed(2) : pctFromBottom >= 100 ? "100" : Math.round(pctFromBottom).toString();
  return `下位${display}%`;
}

const STAT_ORDER = ["資産", "収入", "時間", "人間関係", "健康"] as const;

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
    C: "収入の10〜20%を自動的に投資口座へ移す仕組みを作ろう。意志力に頼らない仕組みが資産形成の第一歩。",
    D: "毎月の固定費を書き出して、削れるものを1つ見つけよう。小さな削減が積み重なって大きな資産になる。",
    E: "今月中に家計の現状を把握することから始めよう。何が入って何が出ているかを知ることがすべての出発点。",
    F: "今月中に家計の現状を把握することから始めよう。何が入って何が出ているかを知ることがすべての出発点。",
  },
  収入: {
    C: "今の市場での自分の価値を確認しよう。転職サイトに登録するだけでも、自分の相場が見えてくる。",
    D: "収入を上げるために何が足りないかを具体的に言語化しよう。スキルなのか、経験なのか、人脈なのか。",
    E: "収入ゼロの状態が何ヶ月続くか計算しよう。その数字が、今すぐ動く理由になる。",
    F: "収入ゼロの状態が何ヶ月続くか計算しよう。その数字が、今すぐ動く理由になる。",
  },
  時間: {
    C: "今週のスケジュールを見直して、やめられることを1つ見つけよう。時間は作るものではなく、削るもの。",
    D: "自分の時間を奪っている最大の原因を1つ特定しよう。仕事・人・習慣、どれかに必ず答えがある。",
    E: "時間がない状態は、人生の主導権を失っているサインかもしれない。何かを手放す決断が必要な時期。",
    F: "時間がない状態は、人生の主導権を失っているサインかもしれない。何かを手放す決断が必要な時期。",
  },
  人間関係: {
    C: "久しぶりに会いたい人に、今日連絡を送ってみよう。人間関係は放置すると静かに消えていく。",
    D: "自分が心地よくいられるコミュニティを1つ探してみよう。オンラインでも、趣味でも、どこからでもいい。",
    E: "孤独は健康にも経済にも影響を与える。まず1人、信頼できる人とのつながりを取り戻すことから始めよう。",
    F: "孤独は健康にも経済にも影響を与える。まず1人、信頼できる人とのつながりを取り戻すことから始めよう。",
  },
  健康: {
    C: "今夜の睡眠時間を30分増やしてみよう。健康のリターンは、どんな投資よりも高い。",
    D: "週2回、20分の散歩から始めよう。運動習慣は小さく始めるほど長続きする。",
    E: "健康を後回しにしてきた時間の分、心と体は正直に反応している。今すぐ医療機関に相談しよう。",
    F: "健康を後回しにしてきた時間の分、心と体は正直に反応している。今すぐ医療機関に相談しよう。",
  },
};

/** ランクがEまたはFの場合はE・F用のアドバイスを表示（同一テキストで登録済み） */
function getQuestAdvice(subject: string, rank: JudgementRank): string {
  return QUEST_ADVICE[subject]?.[rank] ?? "";
}

export default function AnalysisPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [attempt, setAttempt] = useState<LifeExamAttempt | null>(null);
  const [scores, setScores] = useState<LifeExamScore[]>([]);
  const [subjects, setSubjects] = useState<LifeExamSubject[]>([]);
  const [comparisonStats, setComparisonStats] = useState<{
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
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) {
      setLoading(false);
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
      setAttempt(attemptData as LifeExamAttempt);
      setScores((scoresData as LifeExamScore[]) ?? []);
      setSubjects((subjectsData as LifeExamSubject[]) ?? []);

      const { data: statsData } = await supabase.rpc("get_life_exam_comparison_stats", { p_attempt_id: id });
      if (statsData && typeof statsData === "object" && "subjects" in statsData) {
        const st = statsData as { subjects?: Array<{ subject_id: number; avg_all: number | null; stddev_all?: number | null; avg_same_gen: number | null; stddev_same_gen?: number | null; rank_all: number; total_all: number; rank_same_gen: number; total_same_gen: number }> };
        setComparisonStats({ subjects: Array.isArray(st.subjects) ? st.subjects : [] });
      }
      if (scoresErr) setError(scoresErr.message);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#FDFAF5" }}>
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-20">
          <p className="text-[var(--muted)]">読み込み中...</p>
        </main>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen" style={{ background: "#FDFAF5" }}>
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-20">
          <div className="rounded-2xl border border-[var(--card-border)] bg-white p-8">
            <p className="text-[var(--danger)]">{error ?? "結果が見つかりません。"}</p>
            <Link href="/life-exam" className="mt-4 inline-block text-[#C9A84C] hover:underline">
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

  const comparisonRowsBase = subjectsSorted.map((s) => {
    const score = Number(scoreBySubject[s.id] ?? 0);
    const st = comparisonStats?.subjects?.find((x) => x.subject_id === s.id);
    const dev =
      deviationFromPopulation(score, st?.avg_all ?? null, st?.stddev_all ?? null) ?? subjectDeviationFromScore(score);
    return {
      subjectName: getSubjectNameShort(s.code),
      subjectId: s.id,
      score,
      rank: getRankFromDeviation(dev),
    };
  });

  const comparisonRowsSameGen = subjectsSorted.map((s) => {
    const score = Number(scoreBySubject[s.id] ?? 0);
    const st = comparisonStats?.subjects?.find((x) => x.subject_id === s.id);
    const dev =
      deviationFromPopulation(score, st?.avg_same_gen ?? null, st?.stddev_same_gen ?? null) ?? subjectDeviationFromScore(score);
    const rank = getRankFromDeviation(dev);
    const percentText = st && st.total_same_gen > 0 ? formatPercentile(st.rank_same_gen, st.total_same_gen) : null;
    const rankText = st && st.total_same_gen > 0 ? `${st.rank_same_gen}位 / ${st.total_same_gen}人` : null;
    return { subjectName: getSubjectNameShort(s.code), subjectId: s.id, score, rank, percentText, rankText };
  });

  const comparisonRowsAll = subjectsSorted.map((s) => {
    const score = Number(scoreBySubject[s.id] ?? 0);
    const st = comparisonStats?.subjects?.find((x) => x.subject_id === s.id);
    const dev =
      deviationFromPopulation(score, st?.avg_all ?? null, st?.stddev_all ?? null) ?? subjectDeviationFromScore(score);
    const rank = getRankFromDeviation(dev);
    const percentText = st && st.total_all > 0 ? formatPercentile(st.rank_all, st.total_all) : null;
    return { subjectName: getSubjectNameShort(s.code), subjectId: s.id, rank, percentText };
  });

  const rankBySubjectId: Record<number, Rank> = {};
  comparisonRowsSameGen.forEach((row, i) => {
    rankBySubjectId[subjectsSorted[i].id] = row.rank as Rank;
  });
  const characterResult = runDiagnosis(lifeStatsFromExamRanks(rankBySubjectId));
  const evolutionMapInfo = getEvolutionMapInfo(characterResult.id);

  const rowsForDisplay = STAT_ORDER.map((name) => {
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

  const questItems = rowsForDisplay.filter((r) => ["C", "D", "E", "F"].includes(r.rank));

  const cardStyle = {
    background: "#FDFAF5",
    border: "1px solid #C9A84C",
    borderRadius: 16,
    padding: 24,
  };

  return (
    <div className="min-h-screen font-diagnosis-card" style={{ background: "#FDFAF5", fontFamily: "var(--font-noto-serif-jp), serif" }}>
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            詳細分析
          </h1>
          <Link
            href={`/life-exam/result/${id}`}
            className="text-sm font-medium text-[#C9A84C] hover:underline"
          >
            結果に戻る
          </Link>
        </div>

        {/* セクション① ステータス＆ランキング */}
        <section className="mb-8 rounded-2xl" style={cardStyle}>
          <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">
            ⚔️ あなたのステータス
          </h2>
          <div className="divide-y divide-[#E8E0D0]">
            {rowsForDisplay.map((row) => (
              <div
                key={row.subjectName}
                className="py-3 first:pt-0 last:pb-0"
                style={{ minHeight: 80 }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-20 shrink-0 font-bold text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontWeight: 700, fontSize: 16 }}
                  >
                    {row.subjectName}
                  </span>
                  <div
                    className="min-h-[10px] flex-1 overflow-hidden rounded"
                    style={{ background: "#E8E0D0" }}
                  >
                    <div
                      className="h-full rounded transition-[width]"
                      style={{
                        width: `${RANK_FILL_PERCENT[row.rank]}%`,
                        background: "linear-gradient(90deg, #F5D020, #C9A84C)",
                        minHeight: 10,
                      }}
                    />
                  </div>
                  <span
                    className="shrink-0 text-right text-sm font-bold"
                    style={{ color: RANK_COLOR[row.rank], marginLeft: 8 }}
                  >
                    {row.rank}
                  </span>
                </div>
                <p className="mt-1 text-left text-xs text-[var(--muted)]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  同世代 {row.sameGenPercent}　全世代 {row.allPercent}
                </p>
                {STAT_COMMENTS[row.subjectName]?.[row.rank] && (
                  <p
                    className="mt-1 text-left italic"
                    style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 12, color: "#888888", marginTop: 4 }}
                  >
                    {STAT_COMMENTS[row.subjectName][row.rank]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* セクション② クエスト */}
        <section className="mb-8 rounded-2xl" style={cardStyle}>
          <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">
            📜 クエスト
          </h2>
          {questItems.length === 0 ? (
            <p className="text-[var(--muted)]">現在クリアすべきクエストはありません！</p>
          ) : (
            <div className="space-y-3">
              {questItems.map((row) => {
                const difficulty = getQuestDifficulty(row.subjectName, row.rank);
                return (
                  <div
                    key={row.subjectName}
                    className="rounded-lg bg-white"
                    style={{
                      borderLeft: `4px solid ${difficulty?.border ?? "#C9A84C"}`,
                      borderRadius: 8,
                      padding: 16,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#E8E0D0] pb-3">
                      <p className="font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontWeight: 700 }}>
                        ⚠️ {row.subjectName} ランク{row.rank}
                      </p>
                      {difficulty && (
                        <span className="shrink-0 text-sm font-medium" style={{ fontFamily: "var(--font-noto-serif-jp), serif", color: difficulty.color }}>
                          {difficulty.label}
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-3 leading-relaxed text-[var(--foreground)]"
                      style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 14, lineHeight: 1.8 }}
                    >
                      {getQuestAdvice(row.subjectName, row.rank)}
                    </p>
                    {difficulty && (
                      <p
                        className="mt-3"
                        style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 12, color: difficulty.color }}
                      >
                        {difficulty.desc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* セクション③ 進化ロードマップ */}
        <section className="mb-8 rounded-2xl" style={cardStyle}>
          <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            🗺️ 進化ロードマップ
          </h2>

          <div className="flex flex-col items-center gap-4">
            {/* 進化先（上）：ゴールド枠・80px */}
            {!evolutionMapInfo.isSummit && evolutionMapInfo.target && (
              <div
                className="flex flex-col items-center rounded-xl p-4"
                style={{ border: "2px solid #C9A84C", background: "#FDFAF5" }}
              >
                <p className="mb-2 text-xs font-bold text-[#C9A84C]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>進化先</p>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0 overflow-hidden rounded-lg bg-white" style={{ width: 80, height: 80 }}>
                    {!imageErrors[`evo-${evolutionMapInfo.target.id}`] ? (
                      <img
                        src={evolutionMapInfo.target.imagePath}
                        alt=""
                        className="h-full w-full object-contain"
                        onError={() => setImageErrors((e) => ({ ...e, [`evo-${evolutionMapInfo.target!.id}`]: true }))}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">画像</div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{evolutionMapInfo.target.name}</p>
                    <p className="text-sm text-[var(--muted)]">{evolutionMapInfo.target.world}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 進化条件：矢印（↑）24px ゴールド ＋ 条件テキスト */}
            {!evolutionMapInfo.isSummit && evolutionMapInfo.conditionText && evolutionMapInfo.target && (
              <p className="text-center font-medium" style={{ fontFamily: "var(--font-noto-serif-jp), serif", color: "#C9A84C", fontSize: 24 }}>↑</p>
            )}
            {!evolutionMapInfo.isSummit && evolutionMapInfo.conditionText && evolutionMapInfo.target && (
              <p className="text-center text-sm" style={{ fontFamily: "var(--font-noto-serif-jp), serif", color: "#C9A84C" }}>
                {evolutionMapInfo.conditionText} → {evolutionMapInfo.target.name}に進化
              </p>
            )}

            {/* 現在のキャラクター（中央・120px） */}
            <div className="rounded-xl border border-[#C9A84C]/50 bg-[#F5F0E8] p-4">
              {evolutionMapInfo.isSummit && (
                <p className="mb-2 text-center text-sm font-bold text-[#C9A84C]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>頂点に達しています！</p>
              )}
              {evolutionMapInfo.isSummit && (
                <p className="mb-4 text-center text-sm text-[var(--foreground)]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{SUMMIT_MESSAGE}</p>
              )}
              <p className="mb-2 text-xs font-bold text-[var(--muted)]">現在のキャラクター</p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center">
                <div className="relative shrink-0 overflow-hidden rounded-lg bg-white" style={{ width: 120, height: 120 }}>
                  {!imageErrors[characterResult.id] ? (
                    <img
                      src={characterResult.imagePath}
                      alt=""
                      className="h-full w-full object-contain"
                      onError={() => setImageErrors((e) => ({ ...e, [characterResult.id]: true }))}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">画像</div>
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{characterResult.name}</p>
                  <p className="text-sm text-[var(--muted)]">{characterResult.world}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-center">
          <Link
            href={`/life-exam/result/${id}`}
            className="rounded-xl px-6 py-3 font-medium text-white"
            style={{ background: "#C9A84C" }}
          >
            結果ページへ戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
