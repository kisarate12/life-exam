/**
 * 進化ロードマップ：全16キャラの固定進化先と条件
 * アマテラスのみ頂点（進化先なし）、それ以外は条件テキスト＋進化先ID
 */
import type { CharacterId } from "./types";
import { getCharacterResult } from "./logic";
import type { CharacterResult } from "./logic";

/** 頂点メッセージ（アマテラスのみ） */
export const SUMMIT_MESSAGE =
  "全ての頂点に立っています。これ以上の進化はありません。";

export interface EvolutionMapEntry {
  /** 頂点キャラ（アマテラス）の場合は true */
  isSummit: boolean;
  /** 進化条件の文言（例:「資産をS〜Bに上げると」）。頂点の場合は null */
  conditionText: string | null;
  /** 進化先キャラクターID。頂点の場合は null */
  targetId: CharacterId | null;
}

const EVOLUTION_MAP: Record<CharacterId, EvolutionMapEntry> = {
  // 空の世界
  amaterasu: {
    isSummit: true,
    conditionText: null,
    targetId: null,
  },
  king: {
    isSummit: false,
    conditionText: "資産をS〜Bに上げると",
    targetId: "amaterasu",
  },
  lion: {
    isSummit: false,
    conditionText: "健康と人間関係を両方S〜Bに上げると",
    targetId: "amaterasu",
  },
  kaiko: {
    isSummit: false,
    conditionText: "健康か人間関係のどちらかをS〜Bに上げると",
    targetId: "lion",
  },
  // 海の世界
  tsukuyomi: {
    isSummit: false,
    conditionText: "金融をS〜Bに上げると",
    targetId: "amaterasu",
  },
  noble: {
    isSummit: false,
    conditionText: "金融をCに上げると",
    targetId: "tsukuyomi",
  },
  turtle: {
    isSummit: false,
    conditionText: "健康と人間関係を両方S〜Bに上げると",
    targetId: "tsukuyomi",
  },
  snail: {
    isSummit: false,
    conditionText: "健康か人間関係のどちらかをS〜Bに上げると",
    targetId: "turtle",
  },
  // 地上の世界
  dwarf_king: {
    isSummit: false,
    conditionText: "時間をS〜Bに上げると",
    targetId: "amaterasu",
  },
  knight: {
    isSummit: false,
    conditionText: "時間をCに上げると",
    targetId: "dwarf_king",
  },
  tanuki: {
    isSummit: false,
    conditionText: "健康と人間関係を両方S〜Bに上げると",
    targetId: "dwarf_king",
  },
  beetle: {
    isSummit: false,
    conditionText: "健康か人間関係のどちらかをS〜Bに上げると",
    targetId: "tanuki",
  },
  // 冥界
  goblin_king: {
    isSummit: false,
    conditionText: "時間をS〜Bに上げると",
    targetId: "tsukuyomi",
  },
  serf: {
    isSummit: false,
    conditionText: "金融をCに上げると",
    targetId: "goblin_king",
  },
  hyena: {
    isSummit: false,
    conditionText: "健康と人間関係を両方S〜Bに上げると",
    targetId: "goblin_king",
  },
  mosquito: {
    isSummit: false,
    conditionText: "健康か人間関係のどちらかをS〜Bに上げると",
    targetId: "hyena",
  },
};

/**
 * 進化マップ情報を取得。進化先がある場合は target に CharacterResult を入れる
 */
export function getEvolutionMapInfo(currentId: CharacterId): {
  isSummit: boolean;
  conditionText: string | null;
  target: CharacterResult | null;
} {
  const entry = EVOLUTION_MAP[currentId];
  const target =
    entry.targetId != null ? getCharacterResult(entry.targetId) : null;
  return {
    isSummit: entry.isSummit,
    conditionText: entry.conditionText,
    target,
  };
}
