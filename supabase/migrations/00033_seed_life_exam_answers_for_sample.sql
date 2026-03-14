-- サンプル受験（シードユーザー）に設問別回答を付与し、設問別の母数を全サンプル数にする。
-- life_exam_scores の科目スコア（0-100）を按分して各設問の value_numeric を生成する。

DO $$
DECLARE
  seed_user_id uuid;
  inserted_count bigint;
BEGIN
  SELECT id INTO seed_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'auth.users が空のためスキップしました。';
    RETURN;
  END IF;

  WITH seed_attempts AS (
    SELECT id AS attempt_id
    FROM life_exam_attempts
    WHERE user_id = seed_user_id AND exam_version = '2'
  ),
  scores_flat AS (
    SELECT s.attempt_id, s.subject_id, s.score
    FROM life_exam_scores s
    WHERE s.attempt_id IN (SELECT attempt_id FROM seed_attempts)
  ),
  questions_meta AS (
    SELECT
      q.id AS question_id,
      q.subject_id,
      (SELECT COUNT(*)::int FROM life_exam_questions q2 WHERE q2.subject_id = q.subject_id AND q2.response_type = 'v2') AS n,
      (CASE WHEN q.subject_id = 5 THEN 100 ELSE 200 END)::numeric AS subject_max
    FROM life_exam_questions q
    WHERE q.response_type = 'v2'
  ),
  to_insert AS (
    SELECT
      a.attempt_id,
      q.question_id,
      LEAST(100, GREATEST(0, ROUND((s.score / 100.0 * q.subject_max / q.n + (random() - 0.5) * 6)::numeric, 2))) AS value_numeric
    FROM seed_attempts a
    CROSS JOIN questions_meta q
    JOIN scores_flat s ON s.attempt_id = a.attempt_id AND s.subject_id = q.subject_id
  )
  INSERT INTO life_exam_answers (attempt_id, question_id, value_numeric)
  SELECT attempt_id, question_id, value_numeric
  FROM to_insert;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'サンプル受験の設問別回答を % 件投入しました。設問別の母数がサンプル数になります。', inserted_count;
END;
$$;
