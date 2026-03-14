-- 既存サンプルを削除し、収入を年代別（20代低め・30〜40代高め）で再投入する。
-- 20代で年収600万が「同世代では高い」と出るようにする。
-- 実行: 00028 適用後、または本マイグレーション単体で「削除→再投入」を行う。

DO $$
DECLARE
  seed_user_id uuid;
  deleted_count int;
BEGIN
  SELECT id INTO seed_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'auth.users が空のためスキップしました。';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;

  WITH deleted AS (
    DELETE FROM life_exam_attempts WHERE user_id = seed_user_id RETURNING id
  )
  SELECT COUNT(*)::int INTO deleted_count FROM deleted;

  WITH params AS (
    SELECT
      seed_user_id AS uid,
      ARRAY['20-24','25-29','30-34','35-39','40-44','45-49','50-54','55-59','60-64'] AS bands,
      ARRAY[26.0, 30.0, 40.0, 44.0, 48.0, 50.0, 56.0, 58.0, 62.0] AS asset_means,
      ARRAY[24.0, 30.0, 40.0, 46.0, 50.0, 50.0, 46.0, 44.0, 42.0] AS income_means
  ),
  rnd AS (
    SELECT random() AS band_r, random() AS gender_r, random() AS univ_r
    FROM generate_series(1, 5500)
  ),
  band_idx AS (
    SELECT
      (CASE WHEN band_r < 0.05 THEN 1 WHEN band_r < 0.10 THEN 2 WHEN band_r < 0.20 THEN 3
        WHEN band_r < 0.30 THEN 4 WHEN band_r < 0.42 THEN 5 WHEN band_r < 0.55 THEN 6
        WHEN band_r < 0.70 THEN 7 WHEN band_r < 0.85 THEN 8 ELSE 9 END)::int AS bi,
      (1 + floor(gender_r * 2)::int) AS gi,
      (CASE WHEN univ_r < 0.20 THEN NULL::text
        WHEN univ_r < 0.587 THEN (ARRAY['東京大学','京都大学','早稲田大学','慶應義塾大学','大阪大学'])[1 + floor(random() * 5)::int]
        ELSE (ARRAY['北海道大学','東北大学','筑波大学','千葉大学','東京工業大学','一橋大学','名古屋大学','神戸大学','広島大学','九州大学','上智大学','明治大学','青山学院大学','立教大学','中央大学','法政大学','学習院大学','関西大学','関西学院大学','同志社大学','立命館大学','京都産業大学','近畿大学','甲南大学','龍谷大学'])[1 + floor(random() * 25)::int]
      END) AS univ
    FROM rnd
  ),
  gen AS (
    SELECT
      row_number() OVER () AS rn,
      p.uid,
      p.bands[b.bi] AS band,
      (ARRAY['male','female'])[b.gi] AS gender,
      b.univ,
      LEAST(100, GREATEST(0, (p.asset_means[b.bi] + (random() - 0.5) * 28)::numeric(5,2))) AS s1,
      LEAST(100, GREATEST(0, (p.income_means[b.bi] + (CASE WHEN b.gi = 1 THEN 8 ELSE -8 END) + (random() - 0.5) * 20)::numeric(5,2))) AS s2,
      LEAST(100, GREATEST(0, (40 + (random() - 0.5) * 22)::numeric(5,2))) AS s3,
      LEAST(100, GREATEST(0, (40 + (random() - 0.5) * 22)::numeric(5,2))) AS s4,
      LEAST(100, GREATEST(0, (40 + (random() - 0.5) * 22)::numeric(5,2))) AS s5
    FROM params p
    CROSS JOIN band_idx b
  ),
  gen_with_total AS (
    SELECT rn, uid, band, gender, univ, s1, s2, s3, s4, s5,
      (s1 + s2 + s3 + s4 + s5)::numeric(5,2) AS total_score,
      LEAST(100, GREATEST(0, (50 + ((s1 + s2 + s3 + s4 + s5) / 5 - 50) * 0.6)::numeric(5,2))) AS dev
    FROM gen
  ),
  inserted AS (
    INSERT INTO life_exam_attempts (
      user_id, age_band_at_attempt, gender_at_attempt, university_at_attempt,
      total_score, deviation_value, passed, exam_version
    )
    SELECT uid, band, gender, univ, total_score, dev, dev >= 65, '2'
    FROM gen_with_total
    ORDER BY rn
    RETURNING id
  ),
  inserted_with_rn AS (
    SELECT id, row_number() OVER () AS rn FROM inserted
  )
  INSERT INTO life_exam_scores (attempt_id, subject_id, score)
  SELECT i.id, sub.id,
    CASE sub.id WHEN 1 THEN g.s1 WHEN 2 THEN g.s2 WHEN 3 THEN g.s3 WHEN 4 THEN g.s4 WHEN 5 THEN g.s5 END
  FROM inserted_with_rn i
  JOIN gen_with_total g ON g.rn = i.rn
  CROSS JOIN (SELECT id FROM life_exam_subjects ORDER BY id) sub;

  PERFORM life_exam_recompute_all_ranks();

  CREATE TRIGGER tr_life_exam_set_attempt_ranks
    AFTER INSERT ON life_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION life_exam_set_attempt_ranks();

  RAISE NOTICE 'サンプルを削除 % 件し、年代別収入で 5,500 件を再投入しました。', deleted_count;
END;
$$;
