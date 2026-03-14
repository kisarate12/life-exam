-- 基本情報の項目追加（性別・都道府県・年収レンジ・雇用形態・学歴・婚姻・子ども・労働時間・副収入）

ALTER TABLE life_exam_profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS prefecture text,
  ADD COLUMN IF NOT EXISTS income_range text,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS has_children boolean,
  ADD COLUMN IF NOT EXISTS monthly_work_hours int,
  ADD COLUMN IF NOT EXISTS has_side_income boolean;

COMMENT ON COLUMN life_exam_profiles.gender IS '性別（任意）';
COMMENT ON COLUMN life_exam_profiles.prefecture IS '都道府県';
COMMENT ON COLUMN life_exam_profiles.income_range IS '年収レンジ';
COMMENT ON COLUMN life_exam_profiles.employment_type IS '雇用形態';
COMMENT ON COLUMN life_exam_profiles.education IS '最終学歴';
COMMENT ON COLUMN life_exam_profiles.marital_status IS '未婚/既婚';
COMMENT ON COLUMN life_exam_profiles.has_children IS '子ども有無';
COMMENT ON COLUMN life_exam_profiles.monthly_work_hours IS '月労働時間';
COMMENT ON COLUMN life_exam_profiles.has_side_income IS '副収入有無';
