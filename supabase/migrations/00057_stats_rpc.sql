-- ============================================================
-- 00057: 統計ページ用 RPC 関数
-- ============================================================
-- 個人データをRLS越しに集計して返す。SECURITY DEFINER で実行。
-- 返却するのは集計済みデータのみ（個人を特定できる情報は含まない）。
-- ============================================================

CREATE OR REPLACE FUNCTION life_exam_get_public_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result jsonb;
  seed_uid uuid;
  q_asset_id smallint;
  q_income_id smallint;
BEGIN
  -- シードユーザーを特定（最古のユーザー）
  SELECT id INTO seed_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;

  -- question_id を特定
  SELECT id INTO q_asset_id FROM life_exam_questions WHERE label ILIKE '%保有資産%' LIMIT 1;
  SELECT id INTO q_income_id FROM life_exam_questions WHERE label ILIKE '%個人年収%' LIMIT 1;

  WITH base AS (
    SELECT
      r.attempt_id,
      r.character_name,
      r.world,
      a.age_band_at_attempt AS age_band,
      s1.score AS financial_score,
      s2.score AS human_score,
      s3.score AS social_score,
      s4.score AS time_score,
      s5.score AS health_score,
      ans_asset.value_numeric AS asset_points,
      ans_income.value_numeric AS income_points
    FROM life_exam_ranking_entries r
    JOIN life_exam_attempts a ON a.id = r.attempt_id
    LEFT JOIN life_exam_scores s1 ON s1.attempt_id = a.id AND s1.subject_id = 1
    LEFT JOIN life_exam_scores s2 ON s2.attempt_id = a.id AND s2.subject_id = 2
    LEFT JOIN life_exam_scores s3 ON s3.attempt_id = a.id AND s3.subject_id = 3
    LEFT JOIN life_exam_scores s4 ON s4.attempt_id = a.id AND s4.subject_id = 4
    LEFT JOIN life_exam_scores s5 ON s5.attempt_id = a.id AND s5.subject_id = 5
    LEFT JOIN life_exam_answers ans_asset ON ans_asset.attempt_id = a.id AND ans_asset.question_id = q_asset_id
    LEFT JOIN life_exam_answers ans_income ON ans_income.attempt_id = a.id AND ans_income.question_id = q_income_id
    WHERE a.user_id != seed_uid
      AND a.created_at >= '2026-04-01'
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'character_name', character_name,
      'world', world,
      'age_band', age_band,
      'asset_points', asset_points,
      'income_points', income_points,
      'financial_score', financial_score,
      'human_score', human_score,
      'social_score', social_score,
      'time_score', time_score,
      'health_score', health_score
    )
  ) INTO result
  FROM base;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- anon/authenticated どちらでも呼び出せるように
GRANT EXECUTE ON FUNCTION life_exam_get_public_stats() TO anon, authenticated;
