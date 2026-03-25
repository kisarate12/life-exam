/**
 * 人生診断：ランク比較と16キャラクター判定ロジック（仕様書ベース）
 * ランク順序: S > A > B > C > D > E > F（数値が小さいほど良い）
 */
import type { LifeStats, Rank, CharacterId } from "./types";
import { CHARACTER_DEFINITIONS } from "./characters";
import { CHARACTER_IMAGE_BASE } from "./characters";

const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };

type RankRange = "S~B" | "S~A" | "S~C" | "C~F" | "D~F" | "C";

function inRange(rank: Rank, range: RankRange): boolean {
  const r = RANK_ORDER[rank];
  switch (range) {
    case "S~B":
      return r <= 2; // S, A, B
    case "S~A":
      return r <= 1; // S, A のみ
    case "S~C":
      return r <= 3; // S, A, B, C
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
  // アマテラス（1st: 収入 S~A の最上位）
  if (
    inRange(income, "S~A") &&
    inRange(asset, "S~B") &&
    inRange(health, "S~A") &&
    inRange(relationships, "S~A") &&
    inRange(time, "S~A")
  ) {
    return { character: "アマテラス", world: "空" };
  }
  // アマテラス（2nd: 4軸すべて良好 = kinyu S~B + time S~B + health S~C + rel S~B）
  // ※ 人間関係 B 以上の人は孤独ではないためアマテラスへ
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "S~C") &&
    inRange(relationships, "S~B") &&
    inRange(time, "S~B")
  ) {
    return { character: "アマテラス", world: "空" };
  }
  // 孤独な大王: 金融良 + 時間良 + 健康普通以上 + 人間関係 C 以下（平均以下）
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "S~C") &&
    inRange(relationships, "C~F") &&
    inRange(time, "S~B")
  ) {
    return { character: "孤独な大王", world: "空" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(time, "S~B") &&
    inRange(health, "D~F") &&
    inRange(relationships, "S~C")
  ) {
    return { character: "スフィンクス", world: "空" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "D~F") &&
    inRange(relationships, "D~F") &&
    inRange(time, "S~B")
  ) {
    return { character: "カイコ", world: "空" };
  }

  // ===================== 海の世界 =====================
  if (
    inRange(kinyu, "C") &&
    inRange(health, "S~C") &&
    inRange(relationships, "S~C") &&
    inRange(time, "S~A")
  ) {
    return { character: "ツクヨミ", world: "海" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(health, "S~C") &&
    inRange(relationships, "S~C") &&
    inRange(time, "S~B")
  ) {
    return { character: "没落貴族", world: "海" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(time, "S~B") &&
    ((inRange(health, "S~C") && inRange(relationships, "D~F")) ||
      (inRange(health, "D~F") && inRange(relationships, "S~C")))
  ) {
    return { character: "ナマケモノ", world: "海" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(health, "D~F") &&
    inRange(relationships, "D~F") &&
    inRange(time, "S~B")
  ) {
    return { character: "カタツムリ", world: "海" };
  }

  // ===================== 地上の世界 =====================
  if (
    inRange(income, "S~A") &&
    inRange(health, "S~C") &&
    inRange(relationships, "S~C") &&
    inRange(time, "C")
  ) {
    return { character: "ドワーフ王", world: "地上" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "S~C") &&
    inRange(relationships, "S~C") &&
    inRange(time, "C~F")
  ) {
    return { character: "騎士", world: "地上" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(time, "C~F") &&
    ((inRange(health, "S~C") && inRange(relationships, "D~F")) ||
      (inRange(health, "D~F") && inRange(relationships, "S~C")))
  ) {
    return { character: "タヌキ", world: "地上" };
  }
  if (
    inRange(kinyu, "S~B") &&
    inRange(health, "D~F") &&
    inRange(relationships, "D~F") &&
    inRange(time, "C~F")
  ) {
    return { character: "フンコロガシ", world: "地上" };
  }

  // ===================== 冥界 =====================
  if (
    inRange(kinyu, "C") &&
    inRange(health, "S~C") &&
    inRange(relationships, "S~C") &&
    inRange(time, "C~F")
  ) {
    return { character: "オークの族長", world: "冥界" };
  }
  if (
    inRange(kinyu, "D~F") &&
    inRange(health, "S~C") &&
    inRange(relationships, "S~C") &&
    inRange(time, "C~F")
  ) {
    return { character: "流れ者", world: "冥界" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(time, "C~F") &&
    ((inRange(health, "S~C") && inRange(relationships, "D~F")) ||
      (inRange(health, "D~F") && inRange(relationships, "S~C")))
  ) {
    return { character: "ハイエナ", world: "冥界" };
  }
  if (
    inRange(kinyu, "C~F") &&
    inRange(health, "D~F") &&
    inRange(relationships, "D~F") &&
    inRange(time, "C~F")
  ) {
    return { character: "蚊", world: "冥界" };
  }

  return null;
}

/** 判定結果のキャラ名 → CharacterId（定義の name とドワーフ王→ドワーフの王 の対応含む） */
const CHARACTER_NAME_TO_ID: Record<string, CharacterId> = {
  アマテラス: "amaterasu",
  孤独な大王: "king",
  スフィンクス: "egyptian_cat",
  カイコ: "kaiko",
  ツクヨミ: "tsukuyomi",
  没落貴族: "noble",
  ナマケモノ: "namakemono",
  カタツムリ: "snail",
  ドワーフ王: "dwarf_king",
  騎士: "knight",
  タヌキ: "tanuki",
  フンコロガシ: "beetle",
  オークの族長: "goblin_king",
  流れ者: "wanderer",
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
 * 絶対スコア閾値（全国の典型スコアをベース）
 * subject_id: 1=資産, 2=収入, 3=人間関係, 4=時間, 5=健康
 */
export const SCORE_THRESHOLDS = {
  /** 金融: max(sub1_資産, sub2_収入) >= この値で M（収入B閾値=55 を採用） */
  financial: 55,
  /** 時間: sub4 >= この値で F（時間B閾値=62） */
  time: 62,
  /** 人間関係: sub3 >= この値で C（人間関係B閾値=55） */
  relationship: 55,
  /** 健康: sub5 >= この値で H（健康B閾値=60） */
  health: 60,
} as const;

/** アマテラス判定の上位閾値（全軸これ以上でアマテラス、未達はイカロス） */
export const SCORE_THRESHOLDS_HIGH = {
  /** 金融: A閾値（収入A=68） */
  financial: 68,
  /** 時間: A閾値=78 */
  time: 78,
  /** 人間関係: A閾値=72 */
  relationship: 72,
  /** 健康: A閾値=78 */
  health: 78,
} as const;

/** 4文字コード → CharacterId（quick 診断と同じ体系） */
const SCORE_CODE_TO_CHARACTER: Record<string, CharacterId> = {
  MFCH: "amaterasu",  MFLH: "king",      MFCS: "egyptian_cat", MFLS: "kaiko",
  PFCH: "tsukuyomi",  PFLH: "noble",     PFCS: "namakemono",   PFLS: "snail",
  MBCH: "dwarf_king", MBLH: "knight",    MBCS: "tanuki",       MBLS: "beetle",
  PBCH: "goblin_king", PBLH: "wanderer", PBCS: "hyena",        PBLS: "mosquito",
};

/**
 * 科目別生スコア(0-100) からキャラクターIDを絶対評価で判定
 * subject_id: 1=資産, 2=収入, 3=人間関係, 4=時間, 5=健康
 */
export function diagnoseFromScores(scoreBySubjectId: Record<number, number>): CharacterId {
  const asset        = scoreBySubjectId[1] ?? 0;
  const income       = scoreBySubjectId[2] ?? 0;
  const relationship = scoreBySubjectId[3] ?? 0;
  const time         = scoreBySubjectId[4] ?? 0;
  const health       = scoreBySubjectId[5] ?? 0;

  const financial = Math.max(asset, income);
  const m = financial    >= SCORE_THRESHOLDS.financial    ? "M" : "P";
  const f = time         >= SCORE_THRESHOLDS.time         ? "F" : "B";
  const c = relationship >= SCORE_THRESHOLDS.relationship ? "C" : "L";
  const h = health       >= SCORE_THRESHOLDS.health       ? "H" : "S";

  const code = `${m}${f}${c}${h}`;

  // MFCH（全軸クリア）の場合、上位閾値をすべて超えていればアマテラス、未達ならイカロス
  if (code === "MFCH") {
    const isAmaterasu =
      financial    >= SCORE_THRESHOLDS_HIGH.financial    &&
      time         >= SCORE_THRESHOLDS_HIGH.time         &&
      relationship >= SCORE_THRESHOLDS_HIGH.relationship &&
      health       >= SCORE_THRESHOLDS_HIGH.health;
    return isAmaterasu ? "amaterasu" : "icarus";
  }

  return SCORE_CODE_TO_CHARACTER[code] ?? "mosquito";
}

export function runDiagnosisFromScores(scoreBySubjectId: Record<number, number>): CharacterResult {
  return getCharacterResult(diagnoseFromScores(scoreBySubjectId));
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
