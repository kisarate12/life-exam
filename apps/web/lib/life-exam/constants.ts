/**
 * Life Exam 定数（スコア計算ロジック分離の前提）
 */

/** 合格ライン偏差値 */
export const PASS_DEVIATION_THRESHOLD = 65;

/** 科目数・満点 */
export const SUBJECT_COUNT = 5;
export const MAX_SCORE_PER_SUBJECT = 100;
export const TOTAL_MAX_SCORE = SUBJECT_COUNT * MAX_SCORE_PER_SUBJECT; // 500

/**
 * 暫定偏差値（母集団データがない場合のフォールバック）
 * 平均スコア（totalScore/5 = 0〜100）を基準に線形換算し、0〜100にクリップする。
 */
export function provisionalDeviationValue(totalScore: number): number {
  const avg = totalScore / SUBJECT_COUNT;
  const deviation = 50 + (avg - 50) * 0.6;
  return Math.min(100, Math.max(0, deviation));
}

/**
 * 母集団ベースの偏差値（z-score）
 * deviation = 50 + 10 * (score - mean) / stddev。stddev が 0 または未定義の場合は null を返し、呼び出し側で暫定式にフォールバックすること。
 */
export function deviationFromPopulation(
  score: number,
  mean: number | null,
  stddev: number | null
): number | null {
  if (mean == null || stddev == null || stddev <= 0) return null;
  const z = (score - mean) / stddev;
  const deviation = 50 + 10 * z;
  return Math.min(100, Math.max(0, Math.round(deviation * 10) / 10));
}

export function isPassed(deviationValue: number): boolean {
  return deviationValue >= PASS_DEVIATION_THRESHOLD;
}
