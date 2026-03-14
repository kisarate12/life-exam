-- 海の世界のサンプルを追加（金融C〜F かつ 時間S〜B になる科目スコアで投入）
-- 冥界・地上・空に比べて海が極端に少ないため、約1,500件を追加する。

DO $$
DECLARE
  seed_user_id uuid;
  i int;
  s1 numeric; s2 numeric; s3 numeric; s4 numeric; s5 numeric;
  t_score numeric;
  aid uuid;
  age_bands text[] := ARRAY['20-24','25-29','30-34','35-39','40-44','45-49','50-54'];
  genders text[] := ARRAY['male','female'];
BEGIN
  SELECT id INTO seed_user_id FROM auth.users LIMIT 1;
  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'auth.users が空のためスキップします。';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;

  FOR i IN 1..1500
  LOOP
    -- 海の世界: 資産・収入 40〜57 (C〜F)、時間 58〜100 (S〜B)、他は適当
    s1 := 40 + random() * 17;   -- 資産 C〜F
    s2 := 40 + random() * 17;   -- 収入 C〜F
    s4 := 58 + random() * 42;   -- 時間 S〜B
    s3 := 45 + random() * 55;   -- 人間関係
    s5 := 45 + random() * 55;   -- 健康
    t_score := s1 + s2 + s3 + s4 + s5;

    INSERT INTO life_exam_attempts (
      user_id,
      age_band_at_attempt,
      gender_at_attempt,
      total_score,
      deviation_value,
      passed,
      exam_version
    )
    VALUES (
      seed_user_id,
      age_bands[1 + floor(random() * array_length(age_bands, 1))::int],
      genders[1 + floor(random() * array_length(genders, 1))::int],
      ROUND(t_score::numeric, 2),
      LEAST(100, GREATEST(0, 50 + (t_score / 5 - 50) * 0.6))::numeric(5,2),
      (50 + (t_score / 5 - 50) * 0.6) >= 65,
      '2'
    )
    RETURNING id INTO aid;

    INSERT INTO life_exam_scores (attempt_id, subject_id, score)
    VALUES
      (aid, 1, ROUND(s1::numeric, 2)),
      (aid, 2, ROUND(s2::numeric, 2)),
      (aid, 3, ROUND(s3::numeric, 2)),
      (aid, 4, ROUND(s4::numeric, 2)),
      (aid, 5, ROUND(s5::numeric, 2));
  END LOOP;

  PERFORM life_exam_recompute_all_ranks();

  CREATE TRIGGER tr_life_exam_set_attempt_ranks
    AFTER INSERT ON life_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION life_exam_set_attempt_ranks();

  RAISE NOTICE '海の世界サンプル 1500 件を投入しました。';
END;
$$;

-- 追加した受験をランキングに登録（00037 と同じロジック）
INSERT INTO life_exam_ranking_entries (
  attempt_id,
  user_id,
  nickname,
  world,
  character_name,
  character_image,
  total_score
)
SELECT
  a.id,
  a.user_id,
  '名無しの冒険者',
  wc.world_short,
  wc.character_name,
  wc.character_image,
  ROUND((a.total_score / 500.0) * 900)::numeric(6,0)
FROM life_exam_attempts a
JOIN LATERAL (
  SELECT
    MAX(CASE WHEN s.subject_id = 1 THEN s.score END) AS s1,
    MAX(CASE WHEN s.subject_id = 2 THEN s.score END) AS s2,
    MAX(CASE WHEN s.subject_id = 3 THEN s.score END) AS s3,
    MAX(CASE WHEN s.subject_id = 4 THEN s.score END) AS s4,
    MAX(CASE WHEN s.subject_id = 5 THEN s.score END) AS s5
  FROM life_exam_scores s
  WHERE s.attempt_id = a.id
    AND s.subject_id BETWEEN 1 AND 5
  HAVING COUNT(*) = 5
) sc ON true
JOIN LATERAL life_exam_get_world_and_character(
  COALESCE(sc.s1, 50),
  COALESCE(sc.s2, 50),
  COALESCE(sc.s3, 50),
  COALESCE(sc.s4, 50),
  COALESCE(sc.s5, 50)
) wc ON true
WHERE a.exam_version = '2'
  AND wc.world_short = '海'
  AND NOT EXISTS (SELECT 1 FROM life_exam_ranking_entries r WHERE r.attempt_id = a.id)
ON CONFLICT (attempt_id) DO NOTHING;
