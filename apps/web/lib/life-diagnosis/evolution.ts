/**
 * 進化・転落先の算出
 * 最も低いランクのステータスを1段階上げたとき→進化先
 * 最も高いランクのステータスを1段階下げたとき→転落先
 */
import type { LifeStats, Rank, CharacterId } from "./types";
import { RANKS } from "./types";
import { diagnose, getCharacterResult } from "./logic";
import type { CharacterResult } from "./logic";

const RANK_INDEX: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };

const STAT_LABELS: Record<keyof LifeStats, string> = {
  asset: "資産",
  income: "収入",
  relationship: "人間関係",
  time: "時間",
  health: "健康",
};

const STAT_KEYS: (keyof LifeStats)[] = ["asset", "income", "relationship", "time", "health"];

function rankUp(r: Rank): Rank | null {
  const i = RANK_INDEX[r];
  if (i <= 0) return null;
  return RANKS[i - 1];
}

function rankDown(r: Rank): Rank | null {
  const i = RANK_INDEX[r];
  if (i >= 6) return null;
  return RANKS[i + 1];
}

/** 1段階上げたステータスを返す（key のランクのみ変更） */
function statsWithUp(stats: LifeStats, key: keyof LifeStats): LifeStats | null {
  const next = rankUp(stats[key]);
  if (next == null) return null;
  return { ...stats, [key]: next };
}

/** 1段階下げたステータスを返す */
function statsWithDown(stats: LifeStats, key: keyof LifeStats): LifeStats | null {
  const next = rankDown(stats[key]);
  if (next == null) return null;
  return { ...stats, [key]: next };
}

/** 最もランクが低い（悪い）ステータスキー。同点なら先頭優先 */
function getWorstStatKey(stats: LifeStats): keyof LifeStats {
  let worst: keyof LifeStats = "asset";
  let worstIndex = RANK_INDEX[stats.asset];
  for (const k of STAT_KEYS) {
    const i = RANK_INDEX[stats[k]];
    if (i > worstIndex) {
      worstIndex = i;
      worst = k;
    }
  }
  return worst;
}

/** 最もランクが高い（良い）ステータスキー。同点なら先頭優先 */
function getBestStatKey(stats: LifeStats): keyof LifeStats {
  let best: keyof LifeStats = "asset";
  let bestIndex = RANK_INDEX[stats.asset];
  for (const k of STAT_KEYS) {
    const i = RANK_INDEX[stats[k]];
    if (i < bestIndex) {
      bestIndex = i;
      best = k;
    }
  }
  return best;
}

export interface EvolutionTarget {
  subjectLabel: string;
  currentRank: Rank;
  newRank: Rank;
  character: CharacterResult;
}

export interface DegradationTarget {
  subjectLabel: string;
  currentRank: Rank;
  newRank: Rank;
  character: CharacterResult;
}

/** 進化先：最も低いランクのステータスを1段階上げたときのキャラクター */
export function getEvolutionTarget(stats: LifeStats, currentId: CharacterId): EvolutionTarget | null {
  const key = getWorstStatKey(stats);
  const newStats = statsWithUp(stats, key);
  if (!newStats) return null;
  const newId = diagnose(newStats);
  if (newId === currentId) return null;
  const newRank = newStats[key];
  return {
    subjectLabel: STAT_LABELS[key],
    currentRank: stats[key],
    newRank,
    character: getCharacterResult(newId),
  };
}

/** 転落先：最も高いランクのステータスを1段階下げたときのキャラクター */
export function getDegradationTarget(stats: LifeStats, currentId: CharacterId): DegradationTarget | null {
  const key = getBestStatKey(stats);
  const newStats = statsWithDown(stats, key);
  if (!newStats) return null;
  const newId = diagnose(newStats);
  if (newId === currentId) return null;
  const newRank = newStats[key];
  return {
    subjectLabel: STAT_LABELS[key],
    currentRank: stats[key],
    newRank,
    character: getCharacterResult(newId),
  };
}
