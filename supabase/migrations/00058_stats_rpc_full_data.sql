-- ============================================================
-- 00058: 統計 RPC を全データ集計版に更新
-- ============================================================
-- シードデータ含む全受験者をキャラ別に集計して返す。
-- 個別行ではなく集計結果のみ返すため、データ量を抑えつつ全体傾向を可視化可能。
-- ============================================================

CREATE OR REPLACE FUNCTION life_exam_get_public_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH base AS (
    SELECT
      r.character_name,
      r.world,
      a.age_band_at_attempt AS age_band,
      s1.score AS financial_score,
      s2.score AS human_score,
      s3.score AS social_score,
      s4.score AS time_score,
      s5.score AS health_score
    FROM life_exam_ranking_entries r
    JOIN life_exam_attempts a ON a.id = r.attempt_id
    LEFT JOIN life_exam_scores s1 ON s1.attempt_id = a.id AND s1.subject_id = 1
    LEFT JOIN life_exam_scores s2 ON s2.attempt_id = a.id AND s2.subject_id = 2
    LEFT JOIN life_exam_scores s3 ON s3.attempt_id = a.id AND s3.subject_id = 3
    LEFT JOIN life_exam_scores s4 ON s4.attempt_id = a.id AND s4.subject_id = 4
    LEFT JOIN life_exam_scores s5 ON s5.attempt_id = a.id AND s5.subject_id = 5
  ),
  by_character AS (
    SELECT
      character_name,
      world,
      count(*) AS count,
      round(avg(financial_score)::numeric, 1) AS financial_avg,
      round(avg(human_score)::numeric, 1) AS human_avg,
      round(avg(social_score)::numeric, 1) AS social_avg,
      round(avg(time_score)::numeric, 1) AS time_avg,
      round(avg(health_score)::numeric, 1) AS health_avg
    FROM base
    GROUP BY character_name, world
  ),
  by_world AS (
    SELECT
      world,
      count(*) AS count
    FROM base
    GROUP BY world
  ),
  by_age AS (
    SELECT
      age_band,
      count(*) AS count
    FROM base
    WHERE age_band IS NOT NULL
    GROUP BY age_band
  ),
  totals AS (
    SELECT count(*) AS total FROM base
  )
  SELECT jsonb_build_object(
    'total', (SELECT total FROM totals),
    'characters', (SELECT jsonb_agg(
      jsonb_build_object(
        'character_name', character_name,
        'world', world,
        'count', count,
        'financial_avg', financial_avg,
        'human_avg', human_avg,
        'social_avg', social_avg,
        'time_avg', time_avg,
        'health_avg', health_avg
      ) ORDER BY count DESC
    ) FROM by_character),
    'worlds', (SELECT jsonb_agg(
      jsonb_build_object('world', world, 'count', count)
      ORDER BY count DESC
    ) FROM by_world),
    'age_bands', (SELECT jsonb_agg(
      jsonb_build_object('age_band', age_band, 'count', count)
      ORDER BY age_band
    ) FROM by_age)
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
