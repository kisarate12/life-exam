/**
 * 進化・転落ロードマップ
 *
 * キャラクターコードは 4 文字（例: "PBCH"）で構成される。
 *   位置 0: M(good) / P(bad)  … 金融（収入・資産）
 *   位置 1: F(good) / B(bad)  … 時間
 *   位置 2: C(good) / L(bad)  … 人間関係
 *   位置 3: H(good) / S(bad)  … 健康
 *
 * 各位置について:
 *   - bad → good に変えたキャラ = 進化先 (upgrade)
 *   - good → bad に変えたキャラ = 転落先 (downgrade)
 */
import type { CharacterId } from "./types";
import { getCharacterResult } from "./logic";
import type { CharacterResult } from "./logic";

export const SUMMIT_MESSAGE =
  "全ての頂点に立っています。これ以上の進化はありません。";

// ── コードマッピング ────────────────────────────────────────────────────────

export const CHARACTER_CODE: Record<CharacterId, string> = {
  amaterasu:    "MFCH",
  king:         "MFLH",
  egyptian_cat: "MFCS",
  kaiko:        "MFLS",
  tsukuyomi:    "PFCH",
  noble:        "PFLH",
  namakemono:   "PFCS",
  snail:        "PFLS",
  dwarf_king:   "MBCH",
  knight:       "MBLH",
  tanuki:       "MBCS",
  beetle:       "MBLS",
  goblin_king:  "PBCH",
  wanderer:     "PBLH",
  hyena:        "PBCS",
  mosquito:     "PBLS",
};

const CODE_TO_ID: Record<string, CharacterId> = Object.fromEntries(
  (Object.entries(CHARACTER_CODE) as [CharacterId, string][]).map(
    ([id, code]) => [code, id]
  )
);

// ── 次元定義 ──────────────────────────────────────────────────────────────

const DIMENSIONS = [
  { index: 0, good: "M", bad: "P", label: "金融", icon: "💰" },
  { index: 1, good: "F", bad: "B", label: "時間", icon: "⏰" },
  { index: 2, good: "C", bad: "L", label: "人間関係", icon: "🤝" },
  { index: 3, good: "H", bad: "S", label: "健康", icon: "💊" },
] as const;

// ── 型定義 ────────────────────────────────────────────────────────────────

export interface EvolutionPath {
  /** 次元のラベル（例: "金融"） */
  dimension: string;
  /** 次元のアイコン */
  icon: string;
  /** 進化先 or 転落先のキャラクター */
  target: CharacterResult;
}

export interface EvolutionPaths {
  /** 改善可能な軸ごとの進化先（bad → good）。0〜4件 */
  upgrades: EvolutionPath[];
  /** 悪化しうる軸ごとの転落先（good → bad）。0〜4件 */
  downgrades: EvolutionPath[];
  /** アマテラス（全軸 good）のとき true */
  isSummit: boolean;
}

// ── メイン関数 ──────────────────────────────────────────────────────────────

/**
 * 現在のキャラクターIDから進化・転落の全経路を計算する。
 *
 * @example
 * getEvolutionPaths("goblin_king")
 * // upgrades:   金融→dwarf_king, 時間→tsukuyomi
 * // downgrades: 人間関係→wanderer, 健康→hyena
 */
export function getEvolutionPaths(currentId: CharacterId): EvolutionPaths {
  const code = CHARACTER_CODE[currentId];
  const upgrades: EvolutionPath[] = [];
  const downgrades: EvolutionPath[] = [];

  for (const dim of DIMENSIONS) {
    const chars = code.split("");
    const current = chars[dim.index];
    chars[dim.index] = current === dim.bad ? dim.good : dim.bad;
    const targetId = CODE_TO_ID[chars.join("")];
    if (!targetId) continue;

    const path: EvolutionPath = {
      dimension: dim.label,
      icon: dim.icon,
      target: getCharacterResult(targetId),
    };
    if (current === dim.bad) {
      upgrades.push(path);
    } else {
      downgrades.push(path);
    }
  }

  return {
    upgrades,
    downgrades,
    isSummit: currentId === "amaterasu",
  };
}

// ── 後方互換 ───────────────────────────────────────────────────────────────
// 旧 getEvolutionMapInfo を使っているコードがあれば移行するまで残す

/** @deprecated getEvolutionPaths を使ってください */
export interface EvolutionMapEntry {
  isSummit: boolean;
  conditionText: string | null;
  targetId: CharacterId | null;
}

/** @deprecated getEvolutionPaths を使ってください */
export function getEvolutionMapInfo(currentId: CharacterId): {
  isSummit: boolean;
  conditionText: string | null;
  target: CharacterResult | null;
} {
  const { upgrades, isSummit } = getEvolutionPaths(currentId);
  if (isSummit || upgrades.length === 0) {
    return { isSummit: true, conditionText: null, target: null };
  }
  const first = upgrades[0];
  return {
    isSummit: false,
    conditionText: `${first.dimension}を改善すると`,
    target: first.target,
  };
}
