/**
 * クエスト難易度の共通定義（結果・分析ページで共有）— ゲームUI風
 */

import type { JudgementRank } from "./judgement";

export const QUEST_DIFFICULTY = {
  easy: {
    label: "🌿 イージー",
    desc: "習慣を変えれば1〜3ヶ月で改善できます",
    border: "#43756B",
    color: "#43756B",
  },
  normal: {
    label: "⚔️ ノーマル",
    desc: "3〜6ヶ月の継続的な努力で改善できます",
    border: "#FFB84E",
    color: "#FFB84E",
  },
  hard: {
    label: "⚔️⚔️ ハード",
    desc: "6ヶ月〜1年の本気の取り組みが必要です",
    border: "#F57550",
    color: "#F57550",
  },
  extreme: {
    label: "⚔️⚔️⚔️ エクストリーム",
    desc: "1〜3年の抜本的な生活改革が必要です",
    border: "#CC3300",
    color: "#CC3300",
  },
  legend: {
    label: "⚔️⚔️⚔️⚔️ レジェンド",
    desc: "3年以上の長期戦です。覚悟が必要です",
    border: "#9B2CC9",
    color: "#9B2CC9",
  },
} as const;

export type QuestDifficultyKey = keyof typeof QUEST_DIFFICULTY;

/** 難易度マトリクス（ステータス × ランク → 難易度） */
export const QUEST_DIFFICULTY_MATRIX: Record<string, Record<string, QuestDifficultyKey>> = {
  資産: { C: "normal", D: "hard", E: "extreme", F: "extreme" },
  収入: { C: "hard", D: "extreme", E: "legend", F: "legend" },
  時間: { C: "hard", D: "extreme", E: "legend", F: "legend" },
  人間関係: { C: "normal", D: "hard", E: "extreme", F: "extreme" },
  健康: { C: "easy", D: "normal", E: "hard", F: "hard" },
};

export function getQuestDifficulty(
  subject: string,
  rank: JudgementRank
): (typeof QUEST_DIFFICULTY)[QuestDifficultyKey] | null {
  const key = QUEST_DIFFICULTY_MATRIX[subject]?.[rank] ?? null;
  return key != null ? QUEST_DIFFICULTY[key] : null;
}
