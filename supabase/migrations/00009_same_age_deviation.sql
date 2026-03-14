-- 同年齢偏差値用：attempt に norm 参照結果を保存

ALTER TABLE life_exam_attempts
  ADD COLUMN IF NOT EXISTS same_age_mean numeric(12,4),
  ADD COLUMN IF NOT EXISTS same_age_stddev numeric(12,4),
  ADD COLUMN IF NOT EXISTS same_age_deviation_value numeric(6,2);

COMMENT ON COLUMN life_exam_attempts.same_age_mean IS '同年齢バンドの総合得点平均（norm）';
COMMENT ON COLUMN life_exam_attempts.same_age_stddev IS '同年齢バンドの総合得点標準偏差';
COMMENT ON COLUMN life_exam_attempts.same_age_deviation_value IS '50 + 10*(total_score - same_age_mean)/same_age_stddev。NULLの場合は暫定偏差値のみ表示';