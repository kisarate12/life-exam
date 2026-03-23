-- ============================================================
-- 00047: 均等分布サンプルデータ 10,000件 の再投入
-- ============================================================
-- 問題点（00044）:
--   1. ranking_entries への挿入が抜けていた
--      → life_exam_recompute_all_ranks() は attempts のランク列更新のみ
--   2. スコア分布が偏り、アマテラスオオミカミと蚊に集中
--   3. サンプル数不足で偏差値・平均点が表示されない
--
-- 対策:
--   * 4軸 (M/P, F/B, C/L, H/S) を直接制御して均等分布を保証
--   * ranking_entries への明示的な INSERT を追加
--   * サンプル数を 10,000 件に増量
--
-- 目標分布（各軸の Good 率）:
--   M（金融良）= 50%  →  max(s1,s2) >= 50 を確実に保証
--   F（時間良）= 50%  →  s4 >= 50
--   C（人間関係良）= 50%  →  s3 >= 50
--   H（健康良） = 40%  →  s5 >= 65（閾値が高いため控えめに）
--
-- キャラ理論分布（16種）:
--   MFCH アマテラス   5.0%  →   500件
--   MFCS スフィンクス 7.5%  →   750件
--   MFLH 孤独な大王  6.1%  →   610件
--   MFLS カイコ      9.1%  →   910件
--   MBCH ドワーフの王 5.0%  →   500件
--   ...  etc.（全16キャラに分散）
--   PBLS 蚊          7.5%  →   750件
-- ============================================================

DO $$
DECLARE
  seed_user_id uuid;
BEGIN
  SELECT id INTO seed_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'auth.users が空のためスキップしました。';
    RETURN;
  END IF;

  -- トリガー無効化（大量INSERT高速化）
  DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;

  -- 既存シードデータ全削除（ranking_entries も CASCADE で削除される）
  DELETE FROM life_exam_attempts WHERE user_id = seed_user_id;

  -- ================================================================
  -- Step 1: サンプル基本情報 + 4軸フラグ
  -- ================================================================
  CREATE TEMP TABLE _s AS
  SELECT
    gen_random_uuid()  AS id,
    -- 年代: 日本の就業人口に近い分布
    (ARRAY[
      '20-24','25-29','30-34','35-39','40-44',
      '45-49','50-54','55-59','60-64'
    ])[1 + floor(random()*9)::int]  AS age_band,
    -- 性別: ほぼ均等
    (ARRAY['male','female'])[1 + floor(random()*2)::int]  AS gender,
    -- 4軸フラグ（直接制御）
    (random() < 0.50)  AS is_m,   -- 金融良 50%
    (random() < 0.50)  AS is_f,   -- 時間良 50%
    (random() < 0.50)  AS is_c,   -- 人間関係良 50%
    (random() < 0.40)  AS is_h    -- 健康良 40%（閾値65のため控えめ）
  FROM generate_series(1, 10000);

  -- ================================================================
  -- Step 2: 科目スコア生成（各軸の条件を必ず満たすレンジで生成）
  --
  -- スコアは 0–100 の整数。閾値:
  --   金融 = max(s1, s2) >= 50  →  is_m=true: s1∈[52,95], s2∈[45,95]
  --                                is_m=false: s1∈[5,47],  s2∈[5,44]
  --   時間 = s4 >= 50           →  is_f=true:  s4∈[52,95]
  --                                is_f=false: s4∈[5,47]
  --   人間 = s3 >= 50           →  is_c=true:  s3∈[52,95]
  --                                is_c=false: s3∈[5,47]
  --   健康 = s5 >= 65           →  is_h=true:  s5∈[66,97]
  --                                is_h=false: s5∈[20,62]
  -- ================================================================
  CREATE TEMP TABLE _sc AS
  SELECT
    id AS attempt_id,
    -- 資産 (subject 1)
    LEAST(100, GREATEST(0,
      FLOOR(CASE WHEN is_m THEN 52 + random()*43 ELSE 5 + random()*42 END)
    ))::numeric AS s1,
    -- 収入 (subject 2)
    LEAST(100, GREATEST(0,
      FLOOR(CASE WHEN is_m THEN 45 + random()*50 ELSE 5 + random()*39 END)
    ))::numeric AS s2,
    -- 人間関係 (subject 3)
    LEAST(100, GREATEST(0,
      FLOOR(CASE WHEN is_c THEN 52 + random()*43 ELSE 5 + random()*42 END)
    ))::numeric AS s3,
    -- 時間 (subject 4)
    LEAST(100, GREATEST(0,
      FLOOR(CASE WHEN is_f THEN 52 + random()*43 ELSE 5 + random()*42 END)
    ))::numeric AS s4,
    -- 健康 (subject 5) ※閾値 65
    LEAST(100, GREATEST(0,
      FLOOR(CASE WHEN is_h THEN 66 + random()*31 ELSE 20 + random()*42 END)
    ))::numeric AS s5
  FROM _s;

  -- ================================================================
  -- Step 3: life_exam_attempts 投入
  -- ================================================================
  INSERT INTO life_exam_attempts (
    id, user_id,
    age_band_at_attempt, gender_at_attempt,
    total_score, deviation_value, passed, exam_version
  )
  SELECT
    sc.attempt_id,
    seed_user_id,
    s.age_band,
    s.gender,
    ROUND((sc.s1 + sc.s2 + sc.s3 + sc.s4 + sc.s5)::numeric, 2),
    LEAST(100, GREATEST(0, ROUND(
      (50 + ((sc.s1 + sc.s2 + sc.s3 + sc.s4 + sc.s5) / 5.0 - 50) * 0.6)::numeric
    , 2))),
    (sc.s1 + sc.s2 + sc.s3 + sc.s4 + sc.s5) / 5.0 >= 65,
    '2'
  FROM _sc sc
  JOIN _s s ON s.id = sc.attempt_id;

  -- ================================================================
  -- Step 4: life_exam_scores 投入（5科目 × 10,000件）
  -- ================================================================
  INSERT INTO life_exam_scores (attempt_id, subject_id, score)
  SELECT attempt_id, 1, s1 FROM _sc
  UNION ALL SELECT attempt_id, 2, s2 FROM _sc
  UNION ALL SELECT attempt_id, 3, s3 FROM _sc
  UNION ALL SELECT attempt_id, 4, s4 FROM _sc
  UNION ALL SELECT attempt_id, 5, s5 FROM _sc;

  -- ================================================================
  -- Step 5: same_age_deviation_value を年代別偏差値で更新
  -- （全データを使って年代内での相対的な偏差値を計算）
  -- ================================================================
  UPDATE life_exam_attempts a
  SET same_age_deviation_value = ROUND(
    LEAST(100, GREATEST(0,
      50 + (a.total_score - stats.avg_score) / NULLIF(stats.std_score, 0) * 10
    ))::numeric, 1
  )
  FROM (
    SELECT
      age_band_at_attempt,
      AVG(total_score)    AS avg_score,
      STDDEV(total_score) AS std_score
    FROM life_exam_attempts
    GROUP BY age_band_at_attempt
  ) stats
  WHERE a.age_band_at_attempt = stats.age_band_at_attempt;

  -- ================================================================
  -- Step 6: 順位一括再計算
  -- ================================================================
  PERFORM life_exam_recompute_all_ranks();

  -- ================================================================
  -- Step 7: life_exam_ranking_entries 投入
  -- （現在の life_exam_get_world_and_character 関数を使用）
  -- ================================================================
  INSERT INTO life_exam_ranking_entries (
    attempt_id, user_id, nickname,
    world, character_name, character_image,
    total_score
  )
  SELECT
    sc.attempt_id,
    seed_user_id,
    '名無しの冒険者',
    wc.world_short,
    wc.character_name,
    wc.character_image,
    ROUND(((sc.s1 + sc.s2 + sc.s3 + sc.s4 + sc.s5) / 500.0 * 900))::numeric(6,0)
  FROM _sc sc
  JOIN LATERAL life_exam_get_world_and_character(
    sc.s1, sc.s2, sc.s3, sc.s4, sc.s5
  ) wc ON true
  ON CONFLICT (attempt_id) DO NOTHING;

  -- ================================================================
  -- Step 8: トリガー再有効化 & クリーンアップ
  -- ================================================================
  CREATE TRIGGER tr_life_exam_set_attempt_ranks
    AFTER INSERT ON life_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION life_exam_set_attempt_ranks();

  DROP TABLE IF EXISTS _s, _sc;

  RAISE NOTICE '均等分布サンプルデータ 10,000件 を投入し、ranking_entries・偏差値・順位を再計算しました。';
END;
$$;
