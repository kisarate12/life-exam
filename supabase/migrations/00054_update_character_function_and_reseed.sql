-- ============================================================
-- 00054: キャラクター判定関数更新 + シードデータ全面再投入
-- ============================================================
-- 変更内容:
--   1. life_exam_get_world_and_character 関数を v3 閾値に更新
--      旧: financial>=54, time>=53, rel>=54, health>=65
--      新: financial>=55, time>=62, rel>=55, health>=60
--      追加: MFCH かつ全軸 A 閾値超え → アマテラスオオミカミ
--            MFCH かつ A 閾値未達  → イカロス（新キャラ）
--   2. 既存シードデータを全削除してゼロから再投入
--   3. 10,000件・日本の労働人口に近い現実的な人口分布でシード
--
-- 軸フラグ確率（日本社会の実態ベース）:
--   M（金融良）= 38%  … 資産・収入の低い層が多い
--   F（時間良）= 32%  … 長時間労働文化
--   C（人間関係良）= 48%
--   H（健康良）= 45%
--
-- 期待されるキャラ分布（上位〜下位）:
--   蚊（PBLS）        約12% …  最多
--   ハイエナ（PBCS）  約11%
--   流れ者（PBLH）    約10%
--   ...（中間キャラ）
--   イカロス（MFCH）  約 2%  … アマテラスへ一歩手前
--   アマテラス（MFCH 全A超）約 0.3% … 最希少
-- ============================================================

-- ============================================================
-- 1. キャラクター判定関数を v3 仕様に更新
-- ============================================================
CREATE OR REPLACE FUNCTION life_exam_get_world_and_character(
  p_s1 numeric, p_s2 numeric, p_s3 numeric, p_s4 numeric, p_s5 numeric
)
RETURNS TABLE(world_short text, character_name text, character_image text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  financial numeric;
  code4     text;
  cname     text;
  wshort    text;
BEGIN
  -- 金融 = max(資産スコア, 収入スコア)
  financial := GREATEST(p_s1, p_s2);

  -- 4軸を絶対閾値（v3）で判定して 4 文字コードを組み立て
  --   金融: B閾値=55  / 時間: B閾値=62 / 人間関係: B閾値=55 / 健康: B閾値=60
  code4 :=
    CASE WHEN financial >= 55 THEN 'M' ELSE 'P' END ||
    CASE WHEN p_s4      >= 62 THEN 'F' ELSE 'B' END ||
    CASE WHEN p_s3      >= 55 THEN 'C' ELSE 'L' END ||
    CASE WHEN p_s5      >= 60 THEN 'H' ELSE 'S' END;

  -- MFCH: A閾値（上位閾値）を全軸超えていればアマテラスオオミカミ、未達ならイカロス
  --   金融: A閾値=68 / 時間: A閾値=78 / 人間関係: A閾値=72 / 健康: A閾値=78
  IF code4 = 'MFCH' THEN
    IF financial >= 68 AND p_s4 >= 78 AND p_s3 >= 72 AND p_s5 >= 78 THEN
      cname := 'アマテラスオオミカミ';
    ELSE
      cname := 'イカロス';
    END IF;
  ELSE
    cname := CASE code4
      WHEN 'MFLH' THEN '孤独な大王'
      WHEN 'MFCS' THEN 'スフィンクス'
      WHEN 'MFLS' THEN 'カイコ'
      WHEN 'PFCH' THEN 'ツクヨミ'
      WHEN 'PFLH' THEN '没落貴族'
      WHEN 'PFCS' THEN 'ナマケモノ'
      WHEN 'PFLS' THEN 'カタツムリ'
      WHEN 'MBCH' THEN 'ドワーフの王'
      WHEN 'MBLH' THEN '騎士'
      WHEN 'MBCS' THEN 'タヌキ'
      WHEN 'MBLS' THEN 'フンコロガシ'
      WHEN 'PBCH' THEN 'オークの族長'
      WHEN 'PBLH' THEN '流れ者'
      WHEN 'PBCS' THEN 'ハイエナ'
      WHEN 'PBLS' THEN '蚊'
      ELSE '蚊'
    END;
  END IF;

  -- 世界判定（金融×時間の 2 軸で決まる）
  wshort := CASE LEFT(code4, 1) || SUBSTRING(code4, 2, 1)
    WHEN 'MF' THEN '空'
    WHEN 'MB' THEN '地上'
    WHEN 'PF' THEN '海'
    WHEN 'PB' THEN '冥界'
    ELSE '冥界'
  END;

  RETURN QUERY SELECT
    wshort,
    cname,
    ('/life-diagnosis/characters/' || cname || '.png')::text;
END;
$$;

-- ============================================================
-- 2. シードデータ全削除 + 再投入
-- ============================================================
DO $$
DECLARE
  seed_user_id uuid;
BEGIN
  -- シード用ユーザー（最古の auth.users）を取得
  SELECT id INTO seed_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'auth.users が空のためスキップしました。';
    RETURN;
  END IF;

  -- トリガー無効化（大量 INSERT 高速化）
  DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;

  -- 既存シードデータを全削除（ranking_entries は CASCADE で削除される）
  DELETE FROM life_exam_attempts WHERE user_id = seed_user_id;

  -- ================================================================
  -- Step 1: 基本属性 + 4 軸フラグ
  --
  -- 軸確率（日本の労働者実態ベース）:
  --   is_m（金融良 = max(s1,s2) >= 55）= 38%
  --   is_f（時間良 = s4 >= 62）         = 32%  ← 長時間労働文化
  --   is_c（人間関係良 = s3 >= 55）     = 48%
  --   is_h（健康良 = s5 >= 60）         = 45%
  -- ================================================================
  CREATE TEMP TABLE _s AS
  SELECT
    gen_random_uuid() AS id,
    (ARRAY[
      '20-24','25-29','30-34','35-39','40-44',
      '45-49','50-54','55-59','60-64'
    ])[1 + floor(random() * 9)::int]  AS age_band,
    (ARRAY['male','female'])[1 + floor(random() * 2)::int]  AS gender,
    (random() < 0.38) AS is_m,
    (random() < 0.32) AS is_f,
    (random() < 0.48) AS is_c,
    (random() < 0.45) AS is_h
  FROM generate_series(1, 10000);

  -- ================================================================
  -- Step 2: 科目スコア生成（0-100 整数）
  --
  -- 各スコアは各軸の閾値条件を必ず満たす範囲で一様乱数生成:
  --
  --   s1（資産）:
  --     is_m=true  → [28, 90]（s2 が M を保証するため s1 は自由）
  --     is_m=false → [ 5, 52]
  --
  --   s2（収入）:
  --     is_m=true  → [57, 95]（max(s1,s2) >= 55 を確実に保証）
  --     is_m=false → [ 5, 52]
  --
  --   s3（人間関係）:
  --     is_c=true  → [57, 95]
  --     is_c=false → [ 5, 52]
  --
  --   s4（時間）:
  --     is_f=true  → [64, 95]
  --     is_f=false → [ 5, 59]
  --
  --   s5（健康）:
  --     is_h=true  → [62, 95]
  --     is_h=false → [ 5, 57]
  --
  -- ランク分布（social 例）:
  --   is_c=true  [57,95]: S(≥89)≈18%, A(≥72)≈44%, B残≈38%
  --   is_c=false [ 5,52]: C(≥41)≈25%, D(≥27)≈29%, E(≥13)≈29%, F残≈17%
  -- ================================================================
  CREATE TEMP TABLE _sc AS
  SELECT
    id AS attempt_id,
    -- s1: 資産スコア（is_m でも自由に変動）
    FLOOR(CASE WHEN is_m THEN 28 + random() * 62
               ELSE           5 + random() * 47 END)::numeric AS s1,
    -- s2: 収入スコア（is_m の場合 57以上 を保証）
    FLOOR(CASE WHEN is_m THEN 57 + random() * 38
               ELSE           5 + random() * 47 END)::numeric AS s2,
    -- s3: 人間関係スコア
    FLOOR(CASE WHEN is_c THEN 57 + random() * 38
               ELSE           5 + random() * 47 END)::numeric AS s3,
    -- s4: 時間スコア（is_f の場合 64以上 を保証）
    FLOOR(CASE WHEN is_f THEN 64 + random() * 31
               ELSE           5 + random() * 54 END)::numeric AS s4,
    -- s5: 健康スコア（is_h の場合 62以上 を保証）
    FLOOR(CASE WHEN is_h THEN 62 + random() * 33
               ELSE           5 + random() * 52 END)::numeric AS s5
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
    ROUND((sc.s1 + sc.s2 + sc.s3 + sc.s4 + sc.s5)::numeric, 2) AS total_score,
    LEAST(100, GREATEST(0, ROUND(
      (50 + ((sc.s1 + sc.s2 + sc.s3 + sc.s4 + sc.s5) / 5.0 - 50) * 0.6)::numeric
    , 2))) AS deviation_value,
    (sc.s1 + sc.s2 + sc.s3 + sc.s4 + sc.s5) / 5.0 >= 65 AS passed,
    '2' AS exam_version
  FROM _sc sc
  JOIN _s s ON s.id = sc.attempt_id;

  -- ================================================================
  -- Step 4: life_exam_scores 投入（5 科目 × 10,000 件）
  -- ================================================================
  INSERT INTO life_exam_scores (attempt_id, subject_id, score)
  SELECT attempt_id, 1, s1 FROM _sc
  UNION ALL SELECT attempt_id, 2, s2 FROM _sc
  UNION ALL SELECT attempt_id, 3, s3 FROM _sc
  UNION ALL SELECT attempt_id, 4, s4 FROM _sc
  UNION ALL SELECT attempt_id, 5, s5 FROM _sc;

  -- ================================================================
  -- Step 5: 年代別 same_age_deviation_value を更新
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
  --   新しい life_exam_get_world_and_character 関数（イカロス対応）を使用
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

  RAISE NOTICE 'シードデータ 10,000件 の全面再投入が完了しました（v3 閾値・イカロス対応）。';
  RAISE NOTICE '軸確率: M=38%%, F=32%%, C=48%%, H=45%%';
  RAISE NOTICE '推定分布: アマテラス≈0.3%%, イカロス≈2%%, 蚊≈12%%, 中間キャラは均等分散';
END;
$$;
