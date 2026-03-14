/**
 * ランク表示用の共通定数（バー塗りつぶし率・色）
 */

import type { JudgementRank } from "./judgement";

/** ランク → バー塗りつぶし率（0–100） */
export const RANK_FILL_PERCENT: Record<JudgementRank, number> = {
  S: 100,
  A: 85,
  B: 70,
  C: 55,
  D: 40,
  E: 25,
  F: 10,
};

/** ランク → 表示色（hex） */
export const RANK_COLOR: Record<JudgementRank, string> = {
  S: "#FFD700",
  A: "#F5C842",
  B: "#E8B84B",
  C: "#D4A853",
  D: "#B8925A",
  E: "#9C7A61",
  F: "#806268",
};
