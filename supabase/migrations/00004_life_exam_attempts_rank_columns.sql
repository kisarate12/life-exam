-- 合格判定レポート用：同世代総数・性別別順位・同世代×性別順位

ALTER TABLE life_exam_attempts
  ADD COLUMN IF NOT EXISTS gender_at_attempt text,
  ADD COLUMN IF NOT EXISTS same_gen_total int,
  ADD COLUMN IF NOT EXISTS gender_rank int,
  ADD COLUMN IF NOT EXISTS gender_total int,
  ADD COLUMN IF NOT EXISTS same_gen_gender_rank int,
  ADD COLUMN IF NOT EXISTS same_gen_gender_total int;

COMMENT ON COLUMN life_exam_attempts.gender_at_attempt IS '受験時プロフィールの性別（male/female/other）。順位集計のコホート用';
COMMENT ON COLUMN life_exam_attempts.same_gen_total IS '同世代の受験者総数（上位%算出用）';
COMMENT ON COLUMN life_exam_attempts.gender_rank IS '性別別順位';
COMMENT ON COLUMN life_exam_attempts.gender_total IS '当該性別の受験者総数';
COMMENT ON COLUMN life_exam_attempts.same_gen_gender_rank IS '同世代×性別での順位';
COMMENT ON COLUMN life_exam_attempts.same_gen_gender_total IS '同世代×性別の受験者総数';
