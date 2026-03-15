/**
 * 人生診断：ランク比較と16キャラクター判定ロジック（仕様書ベース）
 * ランク順序: S > A > B > C > D > E > F（数値が小さいほど良い）
 */
import type { LifeStats, Rank, CharacterId } from "./types";
import { CHARACTER_DEFINITIONS } from "./characters";
import { CHARACTER_IMAGE_BASE } from "./characters";

const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };

type RankRange = "S~B" | "S~A" | "C~F" | "D~F" | "C";

function inRange(rank: Rank, range: RankRange): boolean {
  const r = RANK_ORDER[rank];
  switch (range) {
    case "S~B":
      return r <= 2; // S, A, B
    case "S~A":
      return r <= 1; // S, A のみ
    case "C~F":
      return r >= 3; // C, D, E, F
    case "D~F":
      return r >= 4; // D, E, F
    case "C":
      return r === 3; // C のみ
    default:
      return false;
  }
}

/** 金融（収入と資産の良い方） */
function getKinyu(income: Rank, asset: Rank): Rank {
  return RANK_ORDER[income] <= RANK_ORDER[asset] ? income : asset;
}

/**
 * キャラクター判定メイン
 * 戻り値: { character: キャラ名, world: '空'|'海'|'地上'|'冥界' }
 */
function determineCharacter(
  income: Rank,
  asset: Rank,
  health: Rank,
  relationships: Rank,
  time: Rank
): { character: string; world: "空" | "海" | "地上" | "冥界" } | null {
  const kinyu = getKinyu(income, asset);

  // ===================== 空の世界 =====================
  if (
    inRange(income, "S~A") &&
    inRange(asset, "S~B") &&
    inRange(health, "S~A") &&
    inRange(relationships, "S~A") &&
    inRange(time, "S~A")
  ) {
    return { character: "アマテラス", world: "空" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "S~B") &&
    inRange(relationships, "S~B") &&
    inRange(time, "S~B")
  ) {
    return { character: "大将軍", world: "空" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(time, "S~B") &&
    ((inRange(health, "S~B") && inRange(relationships, "C~F")) ||
      (inRange(health, "C~F") && inRange(relationships, "S~B")))
  ) {
    return { character: "獅子", world: "空" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "C~F") &&
    inRange(relationships, "C~F") &&
    inRange(time, "S~B")
  ) {
    return { character: "カイコ", world: "空" };
  }

  // ===================== 海の世界 =====================
  if (
    inRange(kinyu, "C") &&
    inRange(health, "S~B") &&
    inRange(relationships, "S~B") &&
    inRange(time, "S~A")
  ) {
    return { character: "ツクヨミ", world: "海" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(health, "S~B") &&
    inRange(relationships, "S~B") &&
    inRange(time, "S~B")
  ) {
    return { character: "下流貴族", world: "海" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(time, "S~B") &&
    ((inRange(health, "S~B") && inRange(relationships, "C~F")) ||
      (inRange(health, "C~F") && inRange(relationships, "S~B")))
  ) {
    return { character: "亀", world: "海" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(health, "C~F") &&
    inRange(relationships, "C~F") &&
    inRange(time, "S~B")
  ) {
    return { character: "カタツムリ", world: "海" };
  }

  // ===================== 地上の世界 =====================
  if (
    inRange(income, "S~A") &&
    inRange(health, "S~B") &&
    inRange(relationships, "S~B") &&
    inRange(time, "C")
  ) {
    return { character: "ドワーフ王", world: "地上" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "S~B") &&
    inRange(relationships, "S~B") &&
    inRange(time, "C~F")
  ) {
    return { character: "騎士", world: "地上" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(time, "C~F") &&
    ((inRange(health, "S~B") && inRange(relationships, "C~F")) ||
      (inRange(health, "C~F") && inRange(relationships, "S~B")))
  ) {
    return { character: "タヌキ", world: "地上" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "C~F") &&
    inRange(relationships, "C~F") &&
    inRange(time, "C~F")
  ) {
    return { character: "フンコロガシ", world: "地上" };
  }

  // ===================== 冥界 =====================
  if (
    inRange(kinyu, "C") &&
    inRange(health, "S~B") &&
    inRange(relationships, "S~B") &&
    inRange(time, "C~F")
  ) {
    return { character: "ゴブリンキング", world: "冥界" };
  }
  if (
    inRange(kinyu, "D~F") &&
    inRange(health, "S~B") &&
    inRange(relationships, "S~B") &&
    inRange(time, "C~F")
  ) {
    return { character: "農奴", world: "冥界" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(time, "C~F") &&
    ((inRange(health, "S~B") && inRange(relationships, "C~F")) ||
      (inRange(health, "C~F") && inRange(relationships, "S~B")))
  ) {
    return { character: "ハイエナ", world: "冥界" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(health, "C~F") &&
    inRange(relationships, "C~F") &&
    inRange(time, "C~F")
  ) {
    return { character: "蚊", world: "冥界" };
  }

  return null;
}

/** 判定結果のキャラ名 → CharacterId（定義の name とドワーフ王→ドワーフの王 の対応含む） */
const CHARACTER_NAME_TO_ID: Record<string, CharacterId> = {
  アマテラス: "amaterasu",
  大将軍: "king",
  獅子: "lion",
  カイコ: "kaiko",
  ツクヨミ: "tsukuyomi",
  下流貴族: "noble",
  亀: "turtle",
  カタツムリ: "snail",
  ドワーフ王: "dwarf_king",
  騎士: "knight",
  タヌキ: "tanuki",
  フンコロガシ: "beetle",
  ゴブリンキング: "goblin_king",
  農奴: "serf",
  ハイエナ: "hyena",
  蚊: "mosquito",
};

/**
 * LifeStats からキャラクターIDを判定
 */
export function diagnose(stats: LifeStats): CharacterId {
  const result = determineCharacter(
    stats.income,
    stats.asset,
    stats.health,
    stats.relationship,
    stats.time
  );
  if (result) {
    const id = CHARACTER_NAME_TO_ID[result.character];
    if (id) return id;
  }
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
 * 人生診断の科目別ランクから LifeStats を組み立てる
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
