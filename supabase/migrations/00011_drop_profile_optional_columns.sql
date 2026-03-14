-- 基本情報から使用しない項目を削除（Ver1は年齢・性別・居住地・志望タイプのみ）

ALTER TABLE life_exam_profiles
  DROP COLUMN IF EXISTS household_income_band,
  DROP COLUMN IF EXISTS personal_assets_yen,
  DROP COLUMN IF EXISTS household_assets_yen,
  DROP COLUMN IF EXISTS monthly_work_hours,
  DROP COLUMN IF EXISTS employment_type,
  DROP COLUMN IF EXISTS education,
  DROP COLUMN IF EXISTS marital_status,
  DROP COLUMN IF EXISTS has_children;
