-- 基本情報：副収入削除、世帯年収・資産系追加（金融資本強化）

ALTER TABLE life_exam_profiles
  DROP COLUMN IF EXISTS has_side_income;

ALTER TABLE life_exam_profiles
  ADD COLUMN IF NOT EXISTS household_income_band text,
  ADD COLUMN IF NOT EXISTS personal_assets_yen bigint,
  ADD COLUMN IF NOT EXISTS household_assets_yen bigint;

COMMENT ON COLUMN life_exam_profiles.household_income_band IS '世帯年収（100万円刻み: 0-99, 100-199, ... 2000+, unknown）';
COMMENT ON COLUMN life_exam_profiles.personal_assets_yen IS '保有資産（円）。任意。';
COMMENT ON COLUMN life_exam_profiles.household_assets_yen IS '世帯資産（円）。任意。';
