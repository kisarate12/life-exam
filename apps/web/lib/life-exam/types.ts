/**
 * 人生の全国共通テスト（Life Exam）型定義
 * DB設計と同期し、拡張前提（年齢バンド・母集団統計）を意識
 */

export type SubjectCode =
  | "financial"
  | "human"
  | "social"
  | "time"
  | "psychological";

export interface LifeExamSubject {
  id: number;
  code: SubjectCode;
  name_ja: string;
}

export interface LifeExamQuestion {
  id: number;
  subject_id: number;
  sort_order: number;
  label: string;
  response_type: string;
  created_at?: string;
}

export interface LifeExamProfile {
  user_id: string;
  birth_year: number | null;
  age_band: string | null;
  gender: string | null;
  prefecture: string | null;
  education_level: string | null;
  university_graduated: string | null;
  faculty: string | null;
  major: string | null;
  aspiration_type: string | null;
  created_at: string;
  updated_at: string;
}

/** 志望タイプ（A〜E）。倍率・合格ラインで利用 */
export type AspirationType = "A" | "B" | "C" | "D" | "E";

export interface LifeExamAttempt {
  id: string;
  user_id: string;
  age_band_at_attempt: string | null;
  gender_at_attempt: string | null;
  aspiration_type_at_attempt: string | null;
  university_at_attempt: string | null;
  exam_version: string;
  total_score: number;
  deviation_value: number;
  passed: boolean;
  same_age_mean: number | null;
  same_age_stddev: number | null;
  same_age_deviation_value: number | null;
  created_at: string;
}

export interface LifeExamAnswer {
  attempt_id: string;
  question_id: number;
  value_numeric: number | null;
  value_text: string | null;
}

export interface LifeExamScore {
  attempt_id: string;
  subject_id: number;
  score: number;
}

/** 将来の偏差値計算用。subject_id が null の場合は総合 */
export interface LifeExamPopulationStats {
  id: string;
  age_band_min: number | null;
  age_band_max: number | null;
  subject_id: number | null;
  mean: number;
  stddev: number;
  sample_count: number;
  updated_at: string;
}
