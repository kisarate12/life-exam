-- 同年齢偏差値用の仮 norm（実データ蓄積後に更新可能）
-- 総合得点のみ（subject_id NULL）。mean=250, stddev=50 の仮置き
-- 既存行がある場合はスキップ（同一バンド・subject_id NULL が既にあれば挿入しない）

INSERT INTO life_exam_population_stats (age_band_min, age_band_max, subject_id, mean, stddev, sample_count)
SELECT v.min, v.max, NULL, 250, 50, 0
FROM (VALUES (10,14), (15,19), (20,24), (25,29), (30,34), (35,39), (40,44), (45,49), (50,54), (55,59), (60,64), (65,69), (70,74), (75,79), (80,84), (85,89), (90,99)) AS v(min, max)
WHERE NOT EXISTS (
  SELECT 1 FROM life_exam_population_stats s
  WHERE s.age_band_min = v.min AND s.age_band_max = v.max AND s.subject_id IS NULL
);