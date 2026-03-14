/**
 * 合格判定・ランク・コメント（模試風表示用）
 * 後で厳密化できるようロジックを分離
 */

import { PASS_DEVIATION_THRESHOLD } from "./constants";

export type JudgementRank = "S" | "A" | "B" | "C" | "D" | "E" | "F";

const RANK_THRESHOLDS: { rank: JudgementRank; minDeviation: number }[] = [
  { rank: "S", minDeviation: 65 },
  { rank: "A", minDeviation: 60 },
  { rank: "B", minDeviation: 55 },
  { rank: "C", minDeviation: 50 },
  { rank: "D", minDeviation: 45 },
  { rank: "E", minDeviation: 40 },
  { rank: "F", minDeviation: -Infinity },
];

/** レベル表示用（偏差値範囲・意味） */
export const RANK_LEVEL_LABELS: Record<JudgementRank, { range: string; meaning: string }> = {
  S: { range: "65以上", meaning: "圧倒的上位層" },
  A: { range: "60〜64.9", meaning: "上位層" },
  B: { range: "55〜59.9", meaning: "準上位層" },
  C: { range: "50〜54.9", meaning: "平均層" },
  D: { range: "45〜49.9", meaning: "下位層" },
  E: { range: "40〜44.9", meaning: "要改善" },
  F: { range: "40未満", meaning: "危険水域" },
};

const JUDGEMENT_COMMENTS: Record<JudgementRank, string> = {
  S: "圧倒的上位層。現時点で成功モデルを大きく上回る。",
  A: "上位層。一般的な成功モデル水準を満たす。",
  B: "準上位層。平均より上だが合格圏まであと一歩。",
  C: "平均層。戦略的に伸ばせば到達可能。",
  D: "下位層。このままでは合格圏に届かない。",
  E: "要改善。早めの対策が有効。",
  F: "危険水域。現状の延長線上に逆転はない。",
};

/**
 * 偏差値から総合判定ランク（S〜F）を返す
 */
export function getJudgement(deviationScore: number): {
  rank: JudgementRank;
  comment: string;
} {
  const sorted = [...RANK_THRESHOLDS].sort((a, b) => b.minDeviation - a.minDeviation);
  for (const { rank, minDeviation } of sorted) {
    if (deviationScore >= minDeviation) {
      return { rank, comment: JUDGEMENT_COMMENTS[rank] };
    }
  }
  return { rank: "F", comment: JUDGEMENT_COMMENTS.F };
}

/** 偏差値からランクのみ返す（科目・タイプ別表示用） */
export function getRankFromDeviation(deviationScore: number): JudgementRank {
  return getJudgement(deviationScore).rank;
}

/**
 * 合格かどうか（偏差値 >= 65）
 */
export function isPassed(deviationScore: number): boolean {
  return deviationScore >= PASS_DEVIATION_THRESHOLD;
}

/**
 * 不合格時のみ：合格まであと何偏差値か（65 - 偏差値）。合格時は null
 */
export function getPointsToPass(deviationScore: number): number | null {
  if (deviationScore >= PASS_DEVIATION_THRESHOLD) return null;
  return Math.round((PASS_DEVIATION_THRESHOLD - deviationScore) * 10) / 10;
}

/**
 * 偏差値を小数1桁でフォーマット
 */
export function formatDeviation(value: number): string {
  return value.toFixed(1);
}

/**
 * 順位・総数の表示用（未取得時は —）
 * 上位% = (total - rank + 1) / total * 100（同年代内での上位パーセント）
 */
export function formatRankDisplay(rank: number | null, total: number | null): {
  rankText: string;
  totalText: string;
  percentText: string | null;
} {
  if (rank == null) {
    return { rankText: "—", totalText: "—", percentText: null };
  }
  const rankText = rank.toLocaleString("ja-JP") + "位";
  const totalText = total != null ? total.toLocaleString("ja-JP") + "人" : "—";
  let percentText: string | null = null;
  if (total != null && total > 0) {
    const p = ((total - rank + 1) / total) * 100;
    percentText = `上位${Math.round(p)}%`;
  }
  return { rankText, totalText, percentText };
}

/** 偏差値から合格確率（0〜100%）を簡易算出。65で100%、45で0%付近 */
export function getPassProbability(deviationScore: number): number {
  if (deviationScore >= PASS_DEVIATION_THRESHOLD) return 100;
  const p = 50 + ((deviationScore - 45) / 20) * 50;
  return Math.round(Math.min(100, Math.max(0, p)));
}

/** 総合得点（0-500）で合格ライン（偏差値65に対応する総合点）との差。不足分は正、余剰は負で返す */
export function getPointsToPassLine(totalScore: number): number {
  const PASS_TOTAL = 375;
  return Math.round((PASS_TOTAL - totalScore) * 10) / 10;
}
