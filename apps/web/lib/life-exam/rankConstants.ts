/**
 * ランク表示用の共通定数（バー塗りつぶし率・色）— Party Animals パレット
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

/** ランク → 表示色（hex）— Party Animals パレット */
export const RANK_COLOR: Record<JudgementRank, string> = {
  S: "#D4960A",
  A: "#5AACBE",
  B: "#43756B",
  C: "#C89A78",
  D: "#F57550",
  E: "#9A9290",
  F: "#706860",
};
