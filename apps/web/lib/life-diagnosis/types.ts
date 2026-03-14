/**
 * 人生診断アプリ：ステータス・ランク・キャラクター型定義
 */

export const RANKS = ["S", "A", "B", "C", "D", "E", "F"] as const;
export type Rank = (typeof RANKS)[number];

export interface LifeStats {
  income: Rank;   // 収入
  asset: Rank;    // 資産
  health: Rank;   // 健康
  relationship: Rank; // 人間関係
  time: Rank;     // 時間
}

export const CHARACTER_IDS = [
  "amaterasu", "king", "lion", "kaiko",
  "tsukuyomi", "noble", "turtle", "snail",
  "dwarf_king", "knight", "tanuki", "beetle",
  "goblin_king", "serf", "hyena", "mosquito",
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface CharacterResult {
  id: CharacterId;
  name: string;
  world: string;
  description: string;
  imagePath: string; // 画像パス（差し替え用）
}
