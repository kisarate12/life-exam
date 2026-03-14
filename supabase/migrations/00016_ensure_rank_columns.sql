-- 順位トリガー用カラムが未作成の環境用（00004/00015 未適用 or 部分適用時）
-- 既に存在するカラムは IF NOT EXISTS でスキップされる

ALTER TABLE life_exam_attempts
  ADD COLUMN IF NOT EXISTS national_total int,
  ADD COLUMN IF NOT EXISTS same_gen_total int,
  ADD COLUMN IF NOT EXISTS gender_rank int,
  ADD COLUMN IF NOT EXISTS gender_total int,
  ADD COLUMN IF NOT EXISTS same_gen_gender_rank int,
  ADD COLUMN IF NOT EXISTS same_gen_gender_total int;

COMMENT ON COLUMN life_exam_attempts.national_total IS '全国の受験者総数（受験時点）';
COMMENT ON COLUMN life_exam_attempts.same_gen_total IS '同世代の受験者総数（上位%算出用）';
COMMENT ON COLUMN life_exam_attempts.gender_rank IS '性別別順位';
COMMENT ON COLUMN life_exam_attempts.gender_total IS '当該性別の受験者総数';
COMMENT ON COLUMN life_exam_attempts.same_gen_gender_rank IS '同世代×性別での順位';
COMMENT ON COLUMN life_exam_attempts.same_gen_gender_total IS '同世代×性別の受験者総数';
