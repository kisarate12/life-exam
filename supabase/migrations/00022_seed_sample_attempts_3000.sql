-- 偏差値・平均・順位のベース用にサンプルデータ約3000件を投入する。
-- 実行条件: auth.users に1件以上存在すること（存在しない場合は何もしない）。

DO $$
DECLARE
  seed_user_id uuid;
BEGIN
  SELECT id INTO seed_user_id FROM auth.users LIMIT 1;
  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'auth.users が空のためサンプルデータは投入しません。先に1件以上ユーザーを作成してください。';
    RETURN;
  END IF;

  -- 一括投入中は順位トリガーを無効化（投入後に life_exam_recompute_all_ranks で一括計算）
  DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;

  -- 1行ごとに total_score を1回だけ乱数で決め、偏差値・passed をそれに合わせて算出
  WITH params AS (
    SELECT
      seed_user_id AS uid,
      ARRAY['20-24','25-29','30-34','35-39','40-44','45-49','50-54'] AS bands,
      ARRAY['male','female'] AS gs
  ),
  rows_with_score AS (
    SELECT (100 + random() * 400)::numeric(5,2) AS t_score
    FROM generate_series(1, 3000)
  ),
  inserted AS (
    INSERT INTO life_exam_attempts (
      user_id,
      age_band_at_attempt,
      gender_at_attempt,
      total_score,
      deviation_value,
      passed,
      exam_version
    )
    SELECT
      p.uid,
      p.bands[1 + floor(random() * array_length(p.bands, 1))::int],
      p.gs[1 + floor(random() * array_length(p.gs, 1))::int],
      r.t_score,
      (LEAST(100, GREATEST(0, 50 + (r.t_score / 5 - 50) * 0.6))::numeric(5,2)),
      (50 + (r.t_score / 5 - 50) * 0.6) >= 65,
      '2'
    FROM params p
    CROSS JOIN rows_with_score r
    RETURNING id, total_score
  )
  INSERT INTO life_exam_scores (attempt_id, subject_id, score)
  SELECT i.id, sub.id, (i.total_score / 5)::numeric(5,2)
  FROM inserted i
  CROSS JOIN life_exam_subjects sub;

  -- 全件の順位を一括再計算
  PERFORM life_exam_recompute_all_ranks();

  -- トリガーを再有効化
  CREATE TRIGGER tr_life_exam_set_attempt_ranks
    AFTER INSERT ON life_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION life_exam_set_attempt_ranks();

  RAISE NOTICE 'サンプルデータ 3000 件を投入し、順位を再計算しました。';
END;
$$;
