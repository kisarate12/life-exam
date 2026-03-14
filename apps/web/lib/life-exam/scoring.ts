/**
 * スコア計算ロジック（Phase3で拡張・母集団偏差値対応を想定して分離）
 * Ver1: 50問（5教科×10問）、4段階/5段階混在 → 科目100点に換算
 * Ver2: 科目別設問・選択肢ごとの点数 → 科目ごと合計を正規化して100点、総合500点
 */

import {
  MAX_SCORE_PER_SUBJECT,
  SUBJECT_COUNT,
  provisionalDeviationValue,
  isPassed,
} from "./constants";
import { DEFAULT_WEIGHTS } from "./ver1-concepts";
import {
  SUBJECT_ID_TO_CODE,
  EXAM_V2_SUBJECT_MAX_POINTS,
  type SubjectCode,
} from "./examV2Questions";

/** 設問ID → 回答値（1〜4 または 1〜5） */
export type AnswersMap = Record<number, number>;

/** 科目ID → スコア（0〜100） */
export type SubjectScoresMap = Record<number, number>;

/** 設問ごとの最大値（4 or 5）。未指定時は5として扱う（後方互換） */
export type QuestionMaxMap = Record<number, number>;

/**
 * 50問の回答から科目別スコアを算出（各科目10問・4/5段階混在 → 100点満点に換算）
 * @param answersMap question_id → 1..4 または 1..5
 * @param questionSubjectMap question_id → subject_id
 * @param questionMaxMap question_id → 4 or 5（省略時は全問5として換算）
 */
export function computeSubjectScores(
  answersMap: AnswersMap,
  questionSubjectMap: Record<number, number>,
  questionMaxMap?: QuestionMaxMap
): SubjectScoresMap {
  const bySubject: Record<number, { raw: number; max: number }> = {};
  for (const [qIdStr, value] of Object.entries(answersMap)) {
    const qId = Number(qIdStr);
    const subjectId = questionSubjectMap[qId];
    if (subjectId == null) continue;
    const maxVal = questionMaxMap?.[qId] ?? 5;
    if (value < 1 || value > maxVal) continue;
    if (!bySubject[subjectId]) bySubject[subjectId] = { raw: 0, max: 0 };
    bySubject[subjectId].raw += value;
    bySubject[subjectId].max += maxVal;
  }
  const result: SubjectScoresMap = {};
  for (let sid = 1; sid <= SUBJECT_COUNT; sid++) {
    const { raw = 0, max = 50 } = bySubject[sid] ?? {};
    const score =
      max > 0
        ? Math.round((raw / max) * MAX_SCORE_PER_SUBJECT * 100) / 100
        : 0;
    result[sid] = score;
  }
  return result;
}

/**
 * 科目別スコアから総合・偏差値・合否を算出
 * @param subjectScores 科目別スコア（1〜5）
 * @param _aspirationType 志望タイプ（取得はするが現時点では計算に使用しない。常に均等ウェイト）
 */
export function computeTotalAndDeviation(
  subjectScores: SubjectScoresMap,
  _aspirationType?: string | null
): {
  totalScore: number;
  deviationValue: number;
  passed: boolean;
} {
  return computeTotalAndDeviationWithWeights(subjectScores, DEFAULT_WEIGHTS);
}

/**
 * 任意の教科ウェイトで加重総合・偏差値を算出（志望校別成績用）
 * @param subjectScores 科目別スコア（subject_id 1〜5、各0〜100）
 * @param weights subject_id → 重み（合計5想定で加重総合は0〜500）
 */
export function computeTotalAndDeviationWithWeights(
  subjectScores: SubjectScoresMap,
  weights: Record<number, number>
): {
  totalScore: number;
  deviationValue: number;
  passed: boolean;
} {
  let total = 0;
  for (let sid = 1; sid <= SUBJECT_COUNT; sid++) {
    const w = weights[sid] ?? 1;
    total += (subjectScores[sid] ?? 0) * w;
  }
  const totalScore = Math.round(total * 100) / 100;
  const deviationValue =
    Math.round(provisionalDeviationValue(totalScore) * 100) / 100;
  const passed = isPassed(deviationValue);
  return { totalScore, deviationValue, passed };
}

/**
 * Ver2: 設問ごとの点数回答から科目スコア（正規化0-100）と総合・偏差値・合否を算出
 * @param answersMap question_id → 選択した選択肢の点数（value_numeric）
 * @param questionSubjectMap question_id → subject_id
 */
export function computeSubjectScoresV2(
  answersMap: Record<number, number>,
  questionSubjectMap: Record<number, number>
): SubjectScoresMap {
  const rawBySubject: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const [qIdStr, points] of Object.entries(answersMap)) {
    const subjectId = questionSubjectMap[Number(qIdStr)];
    if (subjectId != null && typeof points === "number") {
      rawBySubject[subjectId] = (rawBySubject[subjectId] ?? 0) + points;
    }
  }
  const result: SubjectScoresMap = {};
  for (let sid = 1; sid <= SUBJECT_COUNT; sid++) {
    const code = SUBJECT_ID_TO_CODE[sid] as SubjectCode | undefined;
    const maxP = code ? EXAM_V2_SUBJECT_MAX_POINTS[code] : 100;
    const raw = rawBySubject[sid] ?? 0;
    result[sid] =
      maxP > 0
        ? Math.round((raw / maxP) * MAX_SCORE_PER_SUBJECT * 100) / 100
        : 0;
  }
  return result;
}
