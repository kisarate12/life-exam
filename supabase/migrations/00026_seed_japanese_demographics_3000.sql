-- 日本人の年収・貯蓄の実態に沿ったサンプルを約3000件追加する。
-- 参考: 全体年収460〜478万、男性570〜590万・女性310〜330万。
-- 貯蓄: 20代 中央値171万/平均400万、30代 中央値300〜400万、40代 中央値250〜500万、
--       50代 中央値350〜740万、60代 平均1300〜1800万。
-- 実行条件: auth.users に1件以上存在すること。既存データに追加で投入する。

DO $$
DECLARE
  seed_user_id uuid;
BEGIN
  SELECT id INTO seed_user_id FROM auth.users LIMIT 1;
  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'auth.users が空のためサンプルデータは投入しません。';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;

  -- 年代別・性別でスコアを生成。1行で band_idx, gender_idx を決め、資産・収入をそれに合わせて算出。
  WITH params AS (
    SELECT
      seed_user_id AS uid,
      ARRAY['20-24','25-29','30-34','35-39','40-44','45-49','50-54','55-59','60-64'] AS bands,
      ARRAY['male','female'] AS gs,
      -- 年代別 資産スコアの中心（0-100）。20代低め→60代高め（貯蓄中央値・平均のイメージ）
      ARRAY[26.0, 30.0, 40.0, 44.0, 48.0, 50.0, 56.0, 58.0, 62.0] AS asset_means
  ),
  gen AS (
    SELECT
      row_number() OVER () AS rn,
      p.uid,
      p.bands[r.bi] AS band,
      p.gs[r.gi] AS gender,
      LEAST(100, GREATEST(0, (p.asset_means[r.bi] + (random() - 0.5) * 28)::numeric(5,2))) AS s1,
      LEAST(100, GREATEST(0, (CASE WHEN r.gi = 1 THEN 54 ELSE 32 END + (random() - 0.5) * 24)::numeric(5,2))) AS s2,
      LEAST(100, GREATEST(0, (44 + (random() - 0.5) * 24)::numeric(5,2))) AS s3,
      LEAST(100, GREATEST(0, (44 + (random() - 0.5) * 24)::numeric(5,2))) AS s4,
      LEAST(100, GREATEST(0, (44 + (random() - 0.5) * 24)::numeric(5,2))) AS s5
    FROM params p,
         generate_series(1, 3000) i,
         LATERAL (SELECT 1 + floor(random() * 9)::int AS bi, 1 + floor(random() * 2)::int AS gi) r
  ),
  gen_with_total AS (
    SELECT
      rn, uid, band, gender, s1, s2, s3, s4, s5,
      (s1 + s2 + s3 + s4 + s5)::numeric(5,2) AS total_score,
      LEAST(100, GREATEST(0, (50 + ((s1 + s2 + s3 + s4 + s5) / 5 - 50) * 0.6)::numeric(5,2))) AS dev
    FROM gen
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
    SELECT uid, band, gender, total_score, dev, dev >= 65, '2'
    FROM gen_with_total
    ORDER BY rn
    RETURNING id
  ),
  inserted_with_rn AS (
    SELECT id, row_number() OVER () AS rn FROM inserted
  )
  INSERT INTO life_exam_scores (attempt_id, subject_id, score)
  SELECT
    i.id,
    sub.id,
    CASE sub.id
      WHEN 1 THEN g.s1 WHEN 2 THEN g.s2 WHEN 3 THEN g.s3 WHEN 4 THEN g.s4 WHEN 5 THEN g.s5
    END
  FROM inserted_with_rn i
  JOIN gen_with_total g ON g.rn = i.rn
  CROSS JOIN (SELECT id FROM life_exam_subjects ORDER BY id) sub;

  PERFORM life_exam_recompute_all_ranks();

  CREATE TRIGGER tr_life_exam_set_attempt_ranks
    AFTER INSERT ON life_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION life_exam_set_attempt_ranks();

  RAISE NOTICE '日本人実態ベースのサンプル 3000 件を追加し、順位を再計算しました。';
END;
$$;
