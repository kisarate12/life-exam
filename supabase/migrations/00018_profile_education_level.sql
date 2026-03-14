-- 基本情報：最終学歴（必須）。大卒/大学院卒の場合は卒業大学・学部学科を利用

ALTER TABLE life_exam_profiles
  ADD COLUMN IF NOT EXISTS education_level text;

COMMENT ON COLUMN life_exam_profiles.education_level IS '最終学歴（必須）。high_school, vocational, junior_college, university, graduate_school, other';
