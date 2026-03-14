-- 順位用カラム（00004で追加予定のものも含め、存在しなければ追加）
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

-- 受験1件INSERT直後に、その行だけ順位を算出してUPDATEする
CREATE OR REPLACE FUNCTION life_exam_set_attempt_ranks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE life_exam_attempts
  SET
    national_rank = (SELECT COUNT(*) + 1 FROM life_exam_attempts a WHERE a.total_score > NEW.total_score),
    national_total = (SELECT COUNT(*) FROM life_exam_attempts),
    same_gen_rank = (
      SELECT COUNT(*) + 1
      FROM life_exam_attempts a
      WHERE a.age_band_at_attempt IS NOT DISTINCT FROM NEW.age_band_at_attempt
        AND a.total_score > NEW.total_score
    ),
    same_gen_total = (
      SELECT COUNT(*)::int
      FROM life_exam_attempts a
      WHERE a.age_band_at_attempt IS NOT DISTINCT FROM NEW.age_band_at_attempt
    ),
    gender_rank = (
      SELECT COUNT(*) + 1
      FROM life_exam_attempts a
      WHERE a.gender_at_attempt IS NOT DISTINCT FROM NEW.gender_at_attempt
        AND a.total_score > NEW.total_score
    ),
    gender_total = (
      SELECT COUNT(*)::int
      FROM life_exam_attempts a
      WHERE a.gender_at_attempt IS NOT DISTINCT FROM NEW.gender_at_attempt
    ),
    same_gen_gender_rank = (
      SELECT COUNT(*) + 1
      FROM life_exam_attempts a
      WHERE a.age_band_at_attempt IS NOT DISTINCT FROM NEW.age_band_at_attempt
        AND a.gender_at_attempt IS NOT DISTINCT FROM NEW.gender_at_attempt
        AND a.total_score > NEW.total_score
    ),
    same_gen_gender_total = (
      SELECT COUNT(*)::int
      FROM life_exam_attempts a
      WHERE a.age_band_at_attempt IS NOT DISTINCT FROM NEW.age_band_at_attempt
        AND a.gender_at_attempt IS NOT DISTINCT FROM NEW.gender_at_attempt
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;
CREATE TRIGGER tr_life_exam_set_attempt_ranks
  AFTER INSERT ON life_exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION life_exam_set_attempt_ranks();
