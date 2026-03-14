-- 設問別の平均・標準偏差・順位を返す（結果ページ「設問別」詳細用）
CREATE OR REPLACE FUNCTION get_life_exam_question_stats(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  r record;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'question_id', a.question_id,
      'user_score', a.value_numeric,
      'avg_all', ROUND((SELECT AVG(a2.value_numeric)::numeric FROM life_exam_answers a2 JOIN life_exam_attempts t ON t.id = a2.attempt_id WHERE t.exam_version = '2' AND a2.question_id = a.question_id), 2),
      'stddev_all', (SELECT ROUND(STDDEV_SAMP(a2.value_numeric)::numeric, 4) FROM life_exam_answers a2 JOIN life_exam_attempts t ON t.id = a2.attempt_id WHERE t.exam_version = '2' AND a2.question_id = a.question_id),
      'rank_all', (SELECT COUNT(*)::int + 1 FROM life_exam_answers a2 JOIN life_exam_attempts t ON t.id = a2.attempt_id WHERE t.exam_version = '2' AND a2.question_id = a.question_id AND a2.value_numeric > COALESCE(a.value_numeric, 0)),
      'total_all', (SELECT COUNT(*)::int FROM life_exam_answers a2 JOIN life_exam_attempts t ON t.id = a2.attempt_id WHERE t.exam_version = '2' AND a2.question_id = a.question_id)
    )
    ORDER BY a.question_id
  ) INTO v_result
  FROM life_exam_answers a
  WHERE a.attempt_id = p_attempt_id AND a.value_numeric IS NOT NULL;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_life_exam_question_stats(uuid) IS '設問別のユーザー得点・全体平均・標準偏差・順位・母数を返す。偏差値・全体割合はクライアントで算出。';
