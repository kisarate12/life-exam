-- 全受験の順位を一括再計算する関数（サンプルデータ投入後などに実行）
CREATE OR REPLACE FUNCTION life_exam_recompute_all_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH ranks AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY total_score DESC)::int AS national_rank,
      COUNT(*) OVER ()::int AS national_total,
      ROW_NUMBER() OVER (PARTITION BY age_band_at_attempt ORDER BY total_score DESC)::int AS same_gen_rank,
      COUNT(*) OVER (PARTITION BY age_band_at_attempt)::int AS same_gen_total,
      ROW_NUMBER() OVER (PARTITION BY gender_at_attempt ORDER BY total_score DESC)::int AS gender_rank,
      COUNT(*) OVER (PARTITION BY gender_at_attempt)::int AS gender_total,
      ROW_NUMBER() OVER (PARTITION BY age_band_at_attempt, gender_at_attempt ORDER BY total_score DESC)::int AS same_gen_gender_rank,
      COUNT(*) OVER (PARTITION BY age_band_at_attempt, gender_at_attempt)::int AS same_gen_gender_total
    FROM life_exam_attempts
  )
  UPDATE life_exam_attempts a
  SET
    national_rank = r.national_rank,
    national_total = r.national_total,
    same_gen_rank = r.same_gen_rank,
    same_gen_total = r.same_gen_total,
    gender_rank = r.gender_rank,
    gender_total = r.gender_total,
    same_gen_gender_rank = r.same_gen_gender_rank,
    same_gen_gender_total = r.same_gen_gender_total
  FROM ranks r
  WHERE a.id = r.id;
END;
$$;

COMMENT ON FUNCTION life_exam_recompute_all_ranks() IS '全 life_exam_attempts の national_rank / same_gen_rank / gender_rank / same_gen_gender_rank を一括再計算。サンプルデータ投入後に実行する。';
