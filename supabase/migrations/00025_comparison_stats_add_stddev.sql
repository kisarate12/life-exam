-- 偏差値を母集団ベース（z-score）で計算するため、比較統計に標準偏差を追加
CREATE OR REPLACE FUNCTION get_life_exam_comparison_stats(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_age_band text;
  v_total_score numeric;
  v_result jsonb;
BEGIN
  SELECT age_band_at_attempt, total_score
  INTO v_age_band, v_total_score
  FROM life_exam_attempts
  WHERE id = p_attempt_id AND exam_version = '2';

  IF v_total_score IS NULL THEN
    RETURN jsonb_build_object(
      'total_avg_all', null, 'total_stddev_all', null,
      'total_avg_same_gen', null, 'total_stddev_same_gen', null,
      'subjects', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'total_avg_all', (SELECT ROUND(AVG(total_score)::numeric, 2) FROM life_exam_attempts WHERE exam_version = '2'),
    'total_stddev_all', (SELECT ROUND(STDDEV_SAMP(total_score)::numeric, 4) FROM life_exam_attempts WHERE exam_version = '2'),
    'total_avg_same_gen', (SELECT ROUND(AVG(total_score)::numeric, 2) FROM life_exam_attempts WHERE exam_version = '2' AND age_band_at_attempt IS NOT DISTINCT FROM v_age_band),
    'total_stddev_same_gen', (SELECT ROUND(STDDEV_SAMP(total_score)::numeric, 4) FROM life_exam_attempts WHERE exam_version = '2' AND age_band_at_attempt IS NOT DISTINCT FROM v_age_band),
    'subjects', (
      SELECT COALESCE(jsonb_agg(t.sub ORDER BY t.subject_id), '[]'::jsonb)
      FROM (
        SELECT
          s.subject_id,
          jsonb_build_object(
            'subject_id', s.subject_id,
            'avg_all', (SELECT ROUND(AVG(ls.score)::numeric, 2) FROM life_exam_scores ls JOIN life_exam_attempts la ON la.id = ls.attempt_id WHERE la.exam_version = '2' AND ls.subject_id = s.subject_id),
            'stddev_all', (SELECT ROUND(STDDEV_SAMP(ls.score)::numeric, 4) FROM life_exam_scores ls JOIN life_exam_attempts la ON la.id = ls.attempt_id WHERE la.exam_version = '2' AND ls.subject_id = s.subject_id),
            'avg_same_gen', (SELECT ROUND(AVG(ls.score)::numeric, 2) FROM life_exam_scores ls JOIN life_exam_attempts la ON la.id = ls.attempt_id WHERE la.exam_version = '2' AND la.age_band_at_attempt IS NOT DISTINCT FROM v_age_band AND ls.subject_id = s.subject_id),
            'stddev_same_gen', (SELECT ROUND(STDDEV_SAMP(ls.score)::numeric, 4) FROM life_exam_scores ls JOIN life_exam_attempts la ON la.id = ls.attempt_id WHERE la.exam_version = '2' AND la.age_band_at_attempt IS NOT DISTINCT FROM v_age_band AND ls.subject_id = s.subject_id),
            'rank_all', (SELECT COUNT(*)::int + 1 FROM life_exam_scores ls JOIN life_exam_attempts la ON la.id = ls.attempt_id WHERE la.exam_version = '2' AND ls.subject_id = s.subject_id AND ls.score > COALESCE((SELECT score FROM life_exam_scores WHERE attempt_id = p_attempt_id AND subject_id = s.subject_id), 0)),
            'total_all', (SELECT COUNT(*)::int FROM life_exam_scores ls JOIN life_exam_attempts la ON la.id = ls.attempt_id WHERE la.exam_version = '2' AND ls.subject_id = s.subject_id),
            'rank_same_gen', (SELECT COUNT(*)::int + 1 FROM life_exam_scores ls JOIN life_exam_attempts la ON la.id = ls.attempt_id WHERE la.exam_version = '2' AND la.age_band_at_attempt IS NOT DISTINCT FROM v_age_band AND ls.subject_id = s.subject_id AND ls.score > COALESCE((SELECT score FROM life_exam_scores WHERE attempt_id = p_attempt_id AND subject_id = s.subject_id), 0)),
            'total_same_gen', (SELECT COUNT(*)::int FROM life_exam_scores ls JOIN life_exam_attempts la ON la.id = ls.attempt_id WHERE la.exam_version = '2' AND la.age_band_at_attempt IS NOT DISTINCT FROM v_age_band AND ls.subject_id = s.subject_id)
          ) AS sub
        FROM (SELECT 1 AS subject_id UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) s
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_life_exam_comparison_stats(uuid) IS '結果ページ用。平均・標準偏差・順位を返し、偏差値は母集団z-scoreでクライアント計算可能に。';
