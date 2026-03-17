-- 人生診断: 日本の実態に基づくサンプル母集団の再投入（5,500件）
-- =====================================================================
-- 前回のシードデータを全削除し、全41設問の回答分布を日本の人口統計・
-- 労働統計・家計調査に基づいて再生成する。
--
-- 設計方針:
--   * 資産・収入は右に偏った分布（少数の高所得者・富裕層、多数の中低所得者）
--   * 時間資本は低めの平均（日本特有の長時間労働）
--   * 社会資本・健康資本はやや低めの分布
--   * 年代別の資産・収入補正あり（若年低め、壮年高め）
--   * 性別による収入補正あり（男性やや高め）
--   * 25% のグローバル品質相関（同一人物内の科目間相関）
--
-- 目標キャラ分布（概算）:
--   空の世界  ~5%  / 海の世界 ~22% / 地上の世界 ~43% / 闇の世界 ~30%

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

  -- 既存シードデータ削除（CASCADE で scores / answers / ranking_entries も削除）
  DELETE FROM life_exam_attempts WHERE user_id = seed_user_id;

  -- ====================================================================
  -- 1. サンプル 5,500 件の基本情報生成
  -- ====================================================================
  CREATE TEMP TABLE _samples AS
  WITH raw AS (
    SELECT
      gs                     AS sample_id,
      gen_random_uuid()      AS attempt_id,
      random()               AS age_r,
      random()               AS gender_r,
      random()               AS univ_r,
      random()               AS base_q
    FROM generate_series(1, 5500) AS gs
  ),
  demo AS (
    SELECT
      sample_id,
      attempt_id,
      base_q,
      (CASE
        WHEN age_r < 0.05 THEN 1
        WHEN age_r < 0.10 THEN 2
        WHEN age_r < 0.20 THEN 3
        WHEN age_r < 0.30 THEN 4
        WHEN age_r < 0.42 THEN 5
        WHEN age_r < 0.55 THEN 6
        WHEN age_r < 0.70 THEN 7
        WHEN age_r < 0.85 THEN 8
        ELSE 9
      END) AS band_idx,
      (1 + floor(gender_r * 2)::int) AS gender_idx,
      (CASE
        WHEN univ_r < 0.20 THEN NULL::text
        WHEN univ_r < 0.45 THEN
          (ARRAY[
            '東京大学','京都大学','早稲田大学','慶應義塾大学','大阪大学'
          ])[1 + floor(random() * 5)::int]
        ELSE
          (ARRAY[
            '北海道大学','東北大学','筑波大学','千葉大学','東京工業大学',
            '一橋大学','名古屋大学','神戸大学','広島大学','九州大学',
            '上智大学','明治大学','青山学院大学','立教大学','中央大学',
            '法政大学','学習院大学','関西大学','関西学院大学','同志社大学',
            '立命館大学'
          ])[1 + floor(random() * 21)::int]
      END) AS university
    FROM raw
  )
  SELECT
    sample_id,
    attempt_id,
    base_q,
    band_idx,
    gender_idx,
    (ARRAY[
      '20-24','25-29','30-34','35-39','40-44',
      '45-49','50-54','55-59','60-64'
    ])[band_idx] AS age_band,
    (ARRAY['male','female'])[gender_idx] AS gender,
    university
  FROM demo;

  -- ====================================================================
  -- 2. 全 41 設問の回答生成
  --    effective_r = base_q * 0.25 + random() * 0.75 + 年齢/性別バイアス
  --    → 累積分布 (CDF) でポイントに変換
  -- ====================================================================
  CREATE TEMP TABLE _answers AS
  WITH qm AS (
    SELECT id, subject_id, sort_order
    FROM life_exam_questions
    WHERE response_type = 'v2'
  ),
  rands AS (
    SELECT
      s.sample_id,
      q.id         AS question_id,
      q.subject_id AS sid,
      q.sort_order AS so,
      GREATEST(0.001, LEAST(0.999,
        s.base_q * 0.25 + random() * 0.75
        + CASE
            -- 資産Q1: 年齢が上がるほど資産が多い傾向
            WHEN q.subject_id = 1 AND q.sort_order = 1 THEN
              (ARRAY[0.15, 0.08, 0.00, -0.05, -0.08, -0.10, -0.12, -0.10, -0.08])[s.band_idx]
            -- 収入Q1: 年齢ピーク40代 + 男性やや高め
            WHEN q.subject_id = 2 AND q.sort_order = 1 THEN
              (ARRAY[0.15, 0.08, 0.00, -0.05, -0.08, -0.10, -0.08, -0.05, 0.00])[s.band_idx]
              + CASE WHEN s.gender_idx = 1 THEN -0.05 ELSE 0.05 END
            ELSE 0
          END
      )) AS er
    FROM _samples s
    CROSS JOIN qm q
  )
  SELECT
    sample_id,
    question_id,
    sid AS subject_id,
    (CASE
      -- ==============================================================
      -- 金融資本 (subject_id = 1, 満点 200)
      -- ==============================================================

      -- Q1: 保有資産 (max 100)
      -- 1億+:2% / 5000万-1億:4% / 3000万-5000万:6% / 2000万-3000万:8%
      -- 1000万-2000万:12% / 500万-1000万:15% / 100万-500万:23% / 0-99万:22% / 0未満:8%
      WHEN sid=1 AND so=1 THEN
        CASE WHEN er<0.08 THEN 0 WHEN er<0.30 THEN 15 WHEN er<0.53 THEN 30
             WHEN er<0.68 THEN 45 WHEN er<0.80 THEN 60 WHEN er<0.88 THEN 70
             WHEN er<0.94 THEN 80 WHEN er<0.98 THEN 90 ELSE 100 END

      -- Q2: 借金 (max 30)
      -- 3000万+:10% / 1000-2999万:20% / 300-999万:15% / 1-299万:20% / 0円:35%
      WHEN sid=1 AND so=2 THEN
        CASE WHEN er<0.10 THEN 0 WHEN er<0.30 THEN 9 WHEN er<0.45 THEN 18
             WHEN er<0.65 THEN 24 ELSE 30 END

      -- Q3: 月の生活費 (max 20) ※高い=低得点
      -- 60万+:3% / 45-59万:5% / 35-44万:10% / 25-34万:25% / 18-24万:30% / 12-17万:20% / 12万未満:7%
      WHEN sid=1 AND so=3 THEN
        CASE WHEN er<0.03 THEN 0 WHEN er<0.08 THEN 3 WHEN er<0.18 THEN 6
             WHEN er<0.43 THEN 10 WHEN er<0.73 THEN 14 WHEN er<0.93 THEN 17 ELSE 20 END

      -- Q4: 最低限月生活費 (max 40)
      -- 40万+:5% / 30-39万:10% / 20-29万:30% / 15-19万:25% / 10-14万:20% / 10万未満:10%
      WHEN sid=1 AND so=4 THEN
        CASE WHEN er<0.05 THEN 0 WHEN er<0.15 THEN 8 WHEN er<0.45 THEN 18
             WHEN er<0.70 THEN 26 WHEN er<0.90 THEN 34 ELSE 40 END

      -- Q5: 現金化割合 (max 10)
      -- 30%未満:10% / 30-49%:15% / 50-69%:20% / 70-89%:25% / 90%+:30%
      WHEN sid=1 AND so=5 THEN
        CASE WHEN er<0.10 THEN 0 WHEN er<0.25 THEN 3 WHEN er<0.45 THEN 6
             WHEN er<0.70 THEN 8 ELSE 10 END

      -- ==============================================================
      -- 人的資本 (subject_id = 2, 満点 200)
      -- ==============================================================

      -- Q1: 個人年収 (max 50)
      -- 無収入:10% / 400万未満:37% / 400-599万:28% / 600-799万:12%
      -- 800-999万:6% / 1000-1499万:4% / 1500-1999万:1.5% / 2000万+:1.5%
      WHEN sid=2 AND so=1 THEN
        CASE WHEN er<0.10 THEN 0 WHEN er<0.47 THEN 5 WHEN er<0.75 THEN 10
             WHEN er<0.87 THEN 20 WHEN er<0.93 THEN 30 WHEN er<0.97 THEN 40
             WHEN er<0.985 THEN 45 ELSE 50 END

      -- Q2: 5年後の年収見通し (max 40)
      -- 減少可能性:15% / 横ばい:35% / 緩やか増加:35% / 高確率増加:12% / 確実大幅増:3%
      WHEN sid=2 AND so=2 THEN
        CASE WHEN er<0.15 THEN 0 WHEN er<0.50 THEN 10 WHEN er<0.85 THEN 20
             WHEN er<0.97 THEN 30 ELSE 40 END

      -- Q3: スキル希少性 (max 40)
      -- 代替可能:25% / 汎用職:40% / 専門職:25% / 高度専門:8% / 極めて希少:2%
      WHEN sid=2 AND so=3 THEN
        CASE WHEN er<0.25 THEN 0 WHEN er<0.65 THEN 10 WHEN er<0.90 THEN 20
             WHEN er<0.98 THEN 30 ELSE 40 END

      -- Q4: 収入源の数 (max 30)
      -- なし:15% / 1つ:65% / 2つ:15% / 3つ以上:5%
      WHEN sid=2 AND so=4 THEN
        CASE WHEN er<0.15 THEN 0 WHEN er<0.80 THEN 10 WHEN er<0.95 THEN 20 ELSE 30 END

      -- Q5: 収入の裁量 (max 40)
      -- 不可能:13% / 会社依存:45% / 残業で:25% / 副業で:12% / 自由:5%
      WHEN sid=2 AND so=5 THEN
        CASE WHEN er<0.13 THEN 0 WHEN er<0.58 THEN 10 WHEN er<0.83 THEN 20
             WHEN er<0.95 THEN 30 ELSE 40 END

      -- ==============================================================
      -- 社会資本 (subject_id = 3, 満点 200, 14問)
      -- ==============================================================

      -- 恋愛Q1: パートナー関係 (max 25)
      -- いない:45% / 交際中不安定:10% / 交際中安定:15% / 長期安定:30%
      WHEN sid=3 AND so=1 THEN
        CASE WHEN er<0.45 THEN 0 WHEN er<0.55 THEN 10 WHEN er<0.70 THEN 20 ELSE 25 END

      -- 恋愛Q2: 関係満足度 (max 15)
      WHEN sid=3 AND so=2 THEN
        CASE WHEN er<0.30 THEN 0 WHEN er<0.55 THEN 5 WHEN er<0.85 THEN 10 ELSE 15 END

      -- 恋愛Q3: 支え合い (max 15)
      WHEN sid=3 AND so=3 THEN
        CASE WHEN er<0.30 THEN 0 WHEN er<0.55 THEN 5 WHEN er<0.85 THEN 10 ELSE 15 END

      -- 恋愛Q4: 弱みを見せられるか (max 15)
      WHEN sid=3 AND so=4 THEN
        CASE WHEN er<0.30 THEN 0 WHEN er<0.60 THEN 5 WHEN er<0.88 THEN 10 ELSE 15 END

      -- 恋愛Q5: 恋愛孤独感 (max 15)
      WHEN sid=3 AND so=5 THEN
        CASE WHEN er<0.40 THEN 0 WHEN er<0.75 THEN 10 ELSE 15 END

      -- ボンディングQ1: 本音で相談できる友人 (max 20)
      -- 0人:35% / 1人:30% / 2人:20% / 3人+:15%
      WHEN sid=3 AND so=6 THEN
        CASE WHEN er<0.35 THEN 0 WHEN er<0.65 THEN 10 WHEN er<0.85 THEN 15 ELSE 20 END

      -- ボンディングQ2: 家族関係 (max 20)
      -- 疎遠:20% / 普通:30% / 概ね良好:30% / 非常に良好:20%
      WHEN sid=3 AND so=7 THEN
        CASE WHEN er<0.20 THEN 0 WHEN er<0.50 THEN 8 WHEN er<0.80 THEN 15 ELSE 20 END

      -- ボンディングQ3: 緊急時の助け (max 15)
      -- ほぼいない:40% / 1人:35% / 複数:25%
      WHEN sid=3 AND so=8 THEN
        CASE WHEN er<0.40 THEN 0 WHEN er<0.75 THEN 10 ELSE 15 END

      -- ボンディングQ4: 他者からの信頼 (max 10)
      WHEN sid=3 AND so=9 THEN
        CASE WHEN er<0.15 THEN 0 WHEN er<0.45 THEN 3 WHEN er<0.85 THEN 7 ELSE 10 END

      -- ボンディングQ5: 強い孤独感 (max 10)
      WHEN sid=3 AND so=10 THEN
        CASE WHEN er<0.30 THEN 0 WHEN er<0.70 THEN 5 ELSE 10 END

      -- ブリッジングQ1: コミュニティ (max 10)
      -- ない:47% / 1つ:30% / 2つ:15% / 3つ+:8%
      WHEN sid=3 AND so=11 THEN
        CASE WHEN er<0.47 THEN 0 WHEN er<0.77 THEN 5 WHEN er<0.92 THEN 7 ELSE 10 END

      -- ブリッジングQ2: 異業種交流 (max 10)
      -- ほぼなし:60% / 時々:30% / 頻繁:10%
      WHEN sid=3 AND so=12 THEN
        CASE WHEN er<0.60 THEN 0 WHEN er<0.90 THEN 5 ELSE 10 END

      -- ブリッジングQ3: 新しい出会い (max 10)
      -- ほぼなし:53% / 数ヶ月に1回:35% / 毎月:12%
      WHEN sid=3 AND so=13 THEN
        CASE WHEN er<0.53 THEN 0 WHEN er<0.88 THEN 5 ELSE 10 END

      -- ブリッジングQ4: 情報提供 (max 10)
      -- ほぼなし:60% / 時々:32% / 頻繁:8%
      WHEN sid=3 AND so=14 THEN
        CASE WHEN er<0.60 THEN 0 WHEN er<0.92 THEN 5 ELSE 10 END

      -- ==============================================================
      -- 時間資本 (subject_id = 4, 満点 200, 9問)
      -- ==============================================================

      -- 可処分Q1: 週の労働時間 (max 25)
      -- 56h+:20% / 46-55h:35% / 35-45h:30% / 35h未満:15%
      WHEN sid=4 AND so=1 THEN
        CASE WHEN er<0.20 THEN 0 WHEN er<0.55 THEN 10 WHEN er<0.85 THEN 20 ELSE 25 END

      -- 可処分Q2: 平日の自由時間 (max 25)
      -- 1h未満:25% / 1-2h:38% / 2-3h:25% / 3h+:12%
      WHEN sid=4 AND so=2 THEN
        CASE WHEN er<0.25 THEN 0 WHEN er<0.63 THEN 10 WHEN er<0.88 THEN 20 ELSE 25 END

      -- 可処分Q3: 平均睡眠時間 (max 20)
      -- 5h未満:15% / 5-5.9h:30% / 6-6.9h:35% / 7h+:20%
      WHEN sid=4 AND so=3 THEN
        CASE WHEN er<0.15 THEN 0 WHEN er<0.45 THEN 5 WHEN er<0.80 THEN 15 ELSE 20 END

      -- 可処分Q4: 通勤時間 (max 10)
      -- 60分+:40% / 30-59分:35% / 30分未満:25%
      WHEN sid=4 AND so=4 THEN
        CASE WHEN er<0.40 THEN 0 WHEN er<0.75 THEN 5 ELSE 10 END

      -- 裁量Q1: 忙しさの自己選択 (max 40)
      -- 選べない:28% / あまり:42% / ある程度:22% / 完全に:8%
      WHEN sid=4 AND so=5 THEN
        CASE WHEN er<0.28 THEN 0 WHEN er<0.70 THEN 10 WHEN er<0.92 THEN 30 ELSE 40 END

      -- 裁量Q2: 労働時間削減の可能性 (max 30)
      -- 不可能:34% / 難しい:40% / ある程度:18% / 可能:8%
      WHEN sid=4 AND so=6 THEN
        CASE WHEN er<0.34 THEN 0 WHEN er<0.74 THEN 10 WHEN er<0.92 THEN 20 ELSE 30 END

      -- 裁量Q3: 時間帯の裁量 (max 20)
      -- 完全固定:30% / ほぼ固定:42% / ある程度:18% / 完全に:10%
      WHEN sid=4 AND so=7 THEN
        CASE WHEN er<0.30 THEN 0 WHEN er<0.72 THEN 5 WHEN er<0.90 THEN 15 ELSE 20 END

      -- 裁量Q4: 突発的な拘束 (max 15)
      -- 常に:20% / 頻繁:30% / 時々:30% / ほぼなし:20%
      WHEN sid=4 AND so=8 THEN
        CASE WHEN er<0.20 THEN 0 WHEN er<0.50 THEN 5 WHEN er<0.80 THEN 10 ELSE 15 END

      -- 裁量Q5: 長期休暇 (max 15)
      -- 不可能:25% / 難しい:40% / 調整すれば:25% / 自由に:10%
      WHEN sid=4 AND so=9 THEN
        CASE WHEN er<0.25 THEN 0 WHEN er<0.65 THEN 5 WHEN er<0.90 THEN 10 ELSE 15 END

      -- ==============================================================
      -- 健康資本 (subject_id = 5, 満点 100, 8問)
      -- ==============================================================

      -- 身体Q1: 健康状態 (max 20)
      -- 慢性不調:14% / やや不安:28% / 概ね健康:40% / 非常に健康:18%
      WHEN sid=5 AND so=1 THEN
        CASE WHEN er<0.14 THEN 0 WHEN er<0.42 THEN 5 WHEN er<0.82 THEN 15 ELSE 20 END

      -- 身体Q2: 運動習慣 (max 15)
      -- ほぼなし:35% / 月数回:25% / 週1-2:25% / 週3+:15%
      WHEN sid=5 AND so=2 THEN
        CASE WHEN er<0.35 THEN 0 WHEN er<0.60 THEN 5 WHEN er<0.85 THEN 10 ELSE 15 END

      -- 身体Q3: 食生活管理 (max 10)
      -- 無関心:20% / あまり:30% / ある程度:35% / かなり:15%
      WHEN sid=5 AND so=3 THEN
        CASE WHEN er<0.20 THEN 0 WHEN er<0.50 THEN 3 WHEN er<0.85 THEN 7 ELSE 10 END

      -- 身体Q4: 喫煙 (max 5)
      -- 現在吸う:16% / 過去に吸った:12% / 吸わない:72%
      WHEN sid=5 AND so=4 THEN
        CASE WHEN er<0.16 THEN 0 WHEN er<0.28 THEN 3 ELSE 5 END

      -- 精神Q1: 気分の安定度 (max 15)
      -- 不安定:18% / 不安定な時がある:32% / 概ね安定:35% / 非常に安定:15%
      WHEN sid=5 AND so=5 THEN
        CASE WHEN er<0.18 THEN 0 WHEN er<0.50 THEN 5 WHEN er<0.85 THEN 10 ELSE 15 END

      -- 精神Q2: ストレス頻度 (max 15)
      -- 常に:25% / 頻繁:35% / 時々:30% / ほぼなし:10%
      WHEN sid=5 AND so=6 THEN
        CASE WHEN er<0.25 THEN 0 WHEN er<0.60 THEN 5 WHEN er<0.90 THEN 10 ELSE 15 END

      -- 精神Q3: レジリエンス (max 10)
      -- 弱い:18% / やや弱い:32% / 普通:38% / 高い:12%
      WHEN sid=5 AND so=7 THEN
        CASE WHEN er<0.18 THEN 0 WHEN er<0.50 THEN 3 WHEN er<0.88 THEN 7 ELSE 10 END

      -- 精神Q4: 人生の意味 (max 10)
      -- 感じない:22% / あまり:33% / ある程度:33% / 強く:12%
      WHEN sid=5 AND so=8 THEN
        CASE WHEN er<0.22 THEN 0 WHEN er<0.55 THEN 3 WHEN er<0.88 THEN 7 ELSE 10 END

      ELSE 0
    END)::numeric AS pts
  FROM rands;

  -- ====================================================================
  -- 3. 科目別スコア算出（回答点数合計 → 100点満点に正規化）
  -- ====================================================================
  CREATE TEMP TABLE _scores AS
  SELECT
    sample_id,
    subject_id,
    LEAST(100, GREATEST(0, ROUND(
      (SUM(pts) / (CASE WHEN subject_id = 5 THEN 100.0 ELSE 200.0 END) * 100)::numeric
    , 2))) AS score
  FROM _answers
  GROUP BY sample_id, subject_id;

  -- ====================================================================
  -- 4. 総合スコア・偏差値算出
  -- ====================================================================
  CREATE TEMP TABLE _totals AS
  SELECT
    sample_id,
    ROUND(SUM(score)::numeric, 2) AS total_score,
    LEAST(100, GREATEST(0, ROUND(
      (50 + (SUM(score) / 5.0 - 50) * 0.6)::numeric
    , 2))) AS deviation_value
  FROM _scores
  GROUP BY sample_id;

  -- ====================================================================
  -- 5. life_exam_attempts に投入
  -- ====================================================================
  INSERT INTO life_exam_attempts (
    id, user_id, age_band_at_attempt, gender_at_attempt,
    university_at_attempt, total_score, deviation_value, passed, exam_version
  )
  SELECT
    s.attempt_id,
    seed_user_id,
    s.age_band,
    s.gender,
    s.university,
    t.total_score,
    t.deviation_value,
    t.deviation_value >= 65,
    '2'
  FROM _samples s
  JOIN _totals t ON t.sample_id = s.sample_id;

  -- ====================================================================
  -- 6. life_exam_scores に投入
  -- ====================================================================
  INSERT INTO life_exam_scores (attempt_id, subject_id, score)
  SELECT s.attempt_id, sc.subject_id, sc.score
  FROM _samples s
  JOIN _scores sc ON sc.sample_id = s.sample_id;

  -- ====================================================================
  -- 7. life_exam_answers に投入
  -- ====================================================================
  INSERT INTO life_exam_answers (attempt_id, question_id, value_numeric)
  SELECT s.attempt_id, a.question_id, a.pts
  FROM _samples s
  JOIN _answers a ON a.sample_id = s.sample_id;

  -- ====================================================================
  -- 8. 順位再計算・トリガー再有効化
  -- ====================================================================
  PERFORM life_exam_recompute_all_ranks();

  CREATE TRIGGER tr_life_exam_set_attempt_ranks
    AFTER INSERT ON life_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION life_exam_set_attempt_ranks();

  -- ====================================================================
  -- 9. クリーンアップ
  -- ====================================================================
  DROP TABLE IF EXISTS _samples, _answers, _scores, _totals;

  RAISE NOTICE '日本人口実態ベースのサンプルデータ 5,500 件を投入し、順位を再計算しました。';
END;
$$;
