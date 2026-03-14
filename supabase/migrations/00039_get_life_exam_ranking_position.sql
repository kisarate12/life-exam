-- 総合点を渡すと、全世界・各世界の順位と人数を返す（全件集計・件数制限なし）
CREATE OR REPLACE FUNCTION get_life_exam_ranking_position(p_total_score numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global_total int;
  v_global_rank int;
  v_world text;
  v_world_rank int;
  v_world_total int;
  v_result jsonb;
  v_world_stats jsonb := '{}'::jsonb;
BEGIN
  SELECT COUNT(*)::int INTO v_global_total FROM life_exam_ranking_entries;
  SELECT COUNT(*)::int + 1 INTO v_global_rank
  FROM life_exam_ranking_entries
  WHERE total_score > p_total_score;
  IF v_global_rank > v_global_total AND v_global_total > 0 THEN
    v_global_rank := v_global_total;
  END IF;

  FOR v_world IN SELECT DISTINCT world FROM life_exam_ranking_entries
  LOOP
    SELECT COUNT(*)::int INTO v_world_total FROM life_exam_ranking_entries WHERE world = v_world;
    SELECT COUNT(*)::int + 1 INTO v_world_rank
    FROM life_exam_ranking_entries
    WHERE world = v_world AND total_score > p_total_score;
    IF v_world_rank > v_world_total AND v_world_total > 0 THEN
      v_world_rank := v_world_total;
    END IF;
    v_world_stats := v_world_stats || jsonb_build_object(
      v_world,
      jsonb_build_object('rank', v_world_rank, 'total', v_world_total)
    );
  END LOOP;

  v_result := jsonb_build_object(
    'global_rank', v_global_rank,
    'global_total', v_global_total,
    'world_stats', v_world_stats
  );
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_life_exam_ranking_position(numeric) IS '人生審査ランキング：総合点を渡すと全世界・各世界の順位と人数を返す。';

GRANT EXECUTE ON FUNCTION get_life_exam_ranking_position(numeric) TO anon;
GRANT EXECUTE ON FUNCTION get_life_exam_ranking_position(numeric) TO authenticated;
