/**
 * 人生診断：ランク比較と16キャラクター判定ロジック
 * ランク順序: S > A > B > C > D > E > F
 */
import type { LifeStats, Rank, CharacterId } from "./types";
import { RANKS } from "./types";
import { CHARACTER_DEFINITIONS } from "./characters";
import { CHARACTER_IMAGE_BASE } from "./characters";

const RANK_INDEX: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };

/** ランクが high 以上 low 以下（品質で）の範囲か。例: S〜B → inRange(r, 'B', 'S') */
function inRange(rank: Rank, low: Rank, high: Rank): boolean {
  const i = RANK_INDEX[rank];
  return i <= RANK_INDEX[low] && i >= RANK_INDEX[high];
}

/** 2つのランクのうち良い方（Sに近い方）を返す */
function betterRank(a: Rank, b: Rank): Rank {
  return RANK_INDEX[a] <= RANK_INDEX[b] ? a : b;
}

/** 金融 = max(収入, 資産) */
function financeRank(stats: LifeStats): Rank {
  return betterRank(stats.income, stats.asset);
}

/** 空の世界: 金融S〜B かつ 時間S〜B */
function isWorldSky(stats: LifeStats): boolean {
  const fin = financeRank(stats);
  return inRange(fin, "B", "S") && inRange(stats.time, "B", "S");
}

/** 海の世界: 金融C〜F かつ 時間S〜B */
function isWorldSea(stats: LifeStats): boolean {
  const fin = financeRank(stats);
  return inRange(fin, "F", "C") && inRange(stats.time, "B", "S");
}

/** 地上の世界: 金融S〜B かつ 時間C〜F */
function isWorldGround(stats: LifeStats): boolean {
  const fin = financeRank(stats);
  return inRange(fin, "B", "S") && inRange(stats.time, "F", "C");
}

/** 冥界: 金融C〜F かつ 時間C〜F */
function isWorldUnderworld(stats: LifeStats): boolean {
  const fin = financeRank(stats);
  return inRange(fin, "F", "C") && inRange(stats.time, "F", "C");
}

/** 健康S〜B かつ 人間関係C〜F の XOR 的パターン（どちらか一方のみ良い） */
function healthOrRelationshipOnly(stats: LifeStats): boolean {
  const healthGood = inRange(stats.health, "B", "S");
  const relGood = inRange(stats.relationship, "B", "S");
  return (healthGood && !relGood) || (!healthGood && relGood);
}

/** 健康C〜F かつ 人間関係C〜F */
function bothHealthRelBad(stats: LifeStats): boolean {
  return inRange(stats.health, "F", "C") && inRange(stats.relationship, "F", "C");
}

/** 健康S〜B かつ 人間関係S〜B */
function bothHealthRelGood(stats: LifeStats): boolean {
  return inRange(stats.health, "B", "S") && inRange(stats.relationship, "B", "S");
}

/**
 * 16キャラクターのいずれかを上から順に判定して返す
 */
export function diagnose(stats: LifeStats): CharacterId {
  const fin = financeRank(stats);

  // --- 空の世界 ---
  if (isWorldSky(stats)) {
    if (
      inRange(stats.asset, "B", "S") &&
      inRange(stats.health, "B", "S") &&
      inRange(stats.relationship, "B", "S") &&
      inRange(stats.time, "B", "S")
    ) {
      return "amaterasu";
    }
    if (
      inRange(stats.income, "B", "S") &&
      inRange(stats.asset, "F", "C") &&
      inRange(stats.health, "B", "S") &&
      inRange(stats.relationship, "B", "S") &&
      inRange(stats.time, "B", "S")
    ) {
      return "king";
    }
    if (healthOrRelationshipOnly(stats) && inRange(stats.time, "B", "S")) {
      return "lion";
    }
    if (bothHealthRelBad(stats) && inRange(stats.time, "B", "S")) {
      return "kaiko";
    }
  }

  // --- 海の世界 ---
  if (isWorldSea(stats)) {
    if (
      fin === "C" &&
      inRange(stats.health, "B", "S") &&
      inRange(stats.relationship, "B", "S") &&
      inRange(stats.time, "B", "S")
    ) {
      return "tsukuyomi";
    }
    if (
      inRange(fin, "F", "D") &&
      inRange(stats.health, "B", "S") &&
      inRange(stats.relationship, "B", "S") &&
      inRange(stats.time, "B", "S")
    ) {
      return "noble";
    }
    if (healthOrRelationshipOnly(stats) && inRange(stats.time, "B", "S")) {
      return "turtle";
    }
    if (bothHealthRelBad(stats) && inRange(stats.time, "B", "S")) {
      return "snail";
    }
  }

  // --- 地上の世界 ---
  if (isWorldGround(stats)) {
    if (
      bothHealthRelGood(stats) &&
      stats.time === "C"
    ) {
      return "dwarf_king";
    }
    if (
      bothHealthRelGood(stats) &&
      inRange(stats.time, "F", "D")
    ) {
      return "knight";
    }
    if (healthOrRelationshipOnly(stats) && inRange(stats.time, "F", "C")) {
      return "tanuki";
    }
    if (bothHealthRelBad(stats) && inRange(stats.time, "F", "C")) {
      return "beetle";
    }
  }

  // --- 冥界 ---
  if (isWorldUnderworld(stats)) {
    if (
      fin === "C" &&
      inRange(stats.health, "B", "S") &&
      inRange(stats.relationship, "B", "S") &&
      inRange(stats.time, "F", "C")
    ) {
      return "goblin_king";
    }
    if (
      inRange(fin, "F", "D") &&
      inRange(stats.health, "B", "S") &&
      inRange(stats.relationship, "B", "S") &&
      inRange(stats.time, "F", "C")
    ) {
      return "serf";
    }
    if (healthOrRelationshipOnly(stats) && inRange(stats.time, "F", "C")) {
      return "hyena";
    }
    if (bothHealthRelBad(stats) && inRange(stats.time, "F", "C")) {
      return "mosquito";
    }
  }

  // フォールバック（理論上は必ずどれかに入る）
  return "mosquito";
}

export interface CharacterResult {
  id: CharacterId;
  name: string;
  world: string;
  description: string;
  imagePath: string;
}

export function getCharacterResult(id: CharacterId): CharacterResult {
  const def = CHARACTER_DEFINITIONS[id];
  return {
    id,
    name: def.name,
    world: def.world,
    description: def.description,
    imagePath: `${CHARACTER_IMAGE_BASE}/${encodeURIComponent(def.name)}.png`,
  };
}

export function runDiagnosis(stats: LifeStats): CharacterResult {
  const id = diagnose(stats);
  return getCharacterResult(id);
}

/**
 * 人生審査の科目別ランクから LifeStats を組み立てる
 * subject_id: 1=資産, 2=収入, 3=人間関係, 4=時間, 5=健康
 */
export function lifeStatsFromExamRanks(rankBySubjectId: Record<number, Rank>): LifeStats {
  return {
    asset: rankBySubjectId[1] ?? "C",
    income: rankBySubjectId[2] ?? "C",
    relationship: rankBySubjectId[3] ?? "C",
    time: rankBySubjectId[4] ?? "C",
    health: rankBySubjectId[5] ?? "C",
  };
}
