/**
 * 人生診断（Life Exam）lib の barrel
 * 型・定数・スコア・判定・クエスト定数を一括 re-export
 */

export type {
  SubjectCode,
  LifeExamSubject,
  LifeExamQuestion,
  LifeExamProfile,
  LifeExamAttempt,
  LifeExamAnswer,
  LifeExamScore,
  LifeExamPopulationStats,
  AspirationType,
} from "./types";

export {
  PASS_DEVIATION_THRESHOLD,
  SUBJECT_COUNT,
  MAX_SCORE_PER_SUBJECT,
  TOTAL_MAX_SCORE,
  provisionalDeviationValue,
  deviationFromPopulation,
  isPassed,
} from "./constants";

export type { JudgementRank } from "./judgement";
export {
  getJudgement,
  getRankFromDeviation,
  RANK_LEVEL_LABELS,
} from "./judgement";

export type { QuestionOption, QuestionDef } from "./examV2Questions";
export {
  SUBJECT_ID_TO_CODE,
  EXAM_V2_QUESTIONS,
  EXAM_V2_SUBJECT_MAX_POINTS,
  EXAM_V2_SUBJECT_ORDER,
} from "./examV2Questions";

export { RANK_FILL_PERCENT, RANK_COLOR } from "./rankConstants";

export {
  QUEST_DIFFICULTY,
  QUEST_DIFFICULTY_MATRIX,
  getQuestDifficulty,
} from "./questConstants";
export type { QuestDifficultyKey } from "./questConstants";

export { SUBJECT_DISPLAY_SHORT } from "./ver1-concepts";

export {
  WORLD_SHORT,
  WORLD_LABEL_DISPLAY,
  WORLD_DISPLAY,
  getWorldLabelDisplay,
  getWorldDisplay,
  getWorldShort,
} from "./worldDisplay";

export type { AnswersMap, SubjectScoresMap, QuestionMaxMap } from "./scoring";
export {
  computeSubjectScores,
  computeSubjectScoresV2,
  computeTotalAndDeviation,
  computeTotalAndDeviationWithWeights,
} from "./scoring";
