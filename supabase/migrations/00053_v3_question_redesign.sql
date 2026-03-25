-- 00053: v3 設問改訂マイグレーション
--
-- 変更内容:
--   資産    : Q3 生活費→現金化割合, Q4 最低生活費→生活防衛月数, Q5（旧現金化）削除
--             Q2 借金の点数変更 (max 30→40)
--   収入    : 年収を 100pt 化 + 全問再配点
--   人間関係 : 恋愛/友人/家族/ブリッジング 各50pt の4カテゴリに全面刷新 (14問→13問)
--   時間    : Q1 労働時間のスケール変更
--
-- 注意:
--   人間関係の既存回答は互換性がないため全削除。
--   社会資本スコアは既存値を維持し、新規受験から正しく計算される。

DO $$
DECLARE
  q_id INTEGER;
BEGIN

-- ════════════════════════════════════════════════════════
-- 1. 資産（subject_id=1）
-- ════════════════════════════════════════════════════════

-- Q1: ラベル更新（金融資産→保有資産、点数不変）
UPDATE life_exam_questions
SET label = '現在の保有資産はいくらですか？（金融資産・不動産などすべての資産の合計）'
WHERE subject_id = 1 AND sort_order = 1 AND response_type = 'v2';

-- Q2: 借金 点数変更 (max 30→40)
--   旧: 30/24/18/9/0 → 新: 40/32/22/10/0
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 1 AND sort_order = 2 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  UPDATE life_exam_answers
  SET value_numeric = CASE value_numeric
    WHEN 30 THEN 40
    WHEN 24 THEN 32
    WHEN 18 THEN 22
    WHEN  9 THEN 10
    ELSE value_numeric
  END
  WHERE question_id = q_id AND value_numeric IN (30, 24, 18, 9);
END IF;

-- Q3: 旧「月の生活費」→ 新「現金化割合」（点数互換性なし → 既存回答削除）
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 1 AND sort_order = 3 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  DELETE FROM life_exam_answers WHERE question_id = q_id;
  UPDATE life_exam_questions
  SET label = 'あなたの金融資産のうちすぐ現金化できる割合はどの程度ですか？'
  WHERE id = q_id;
END IF;

-- Q4: 旧「最低生活費」→ 新「生活防衛月数」（点数互換性なし → 既存回答削除）
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 1 AND sort_order = 4 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  DELETE FROM life_exam_answers WHERE question_id = q_id;
  UPDATE life_exam_questions
  SET label = '収入がゼロになった場合、現在の資産で何ヶ月生活できますか？'
  WHERE id = q_id;
END IF;

-- Q5: 旧「現金化割合」→ 削除（Q3に統合）
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 1 AND sort_order = 5 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  DELETE FROM life_exam_answers WHERE question_id = q_id;
  DELETE FROM life_exam_questions WHERE id = q_id;
END IF;

-- ════════════════════════════════════════════════════════
-- 2. 収入（subject_id=2）全問再配点
-- ════════════════════════════════════════════════════════

-- Q1: 年収 (max 50→100, 新スケール)
--   旧: 50/46/42/35/28/18/8/0 → 新: 90/80/68/58/52/46/38/30/20/10/4/0
--   旧 tiers → 最も近い新 tier にマッピング
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 2 AND sort_order = 1 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  UPDATE life_exam_answers
  SET value_numeric = CASE value_numeric
    WHEN 50 THEN 90   -- 2000万以上 → 2000〜2999万相当
    WHEN 46 THEN 80   -- 1500〜1999万
    WHEN 42 THEN 68   -- 1000〜1499万
    WHEN 35 THEN 58   -- 800〜999万
    WHEN 28 THEN 46   -- 600〜799万 → 600〜699万相当
    WHEN 18 THEN 30   -- 400〜599万 → 400〜499万相当
    WHEN  8 THEN 10   -- 400万未満 → 200〜299万相当
    WHEN  0 THEN  0   -- 無収入
    ELSE value_numeric
  END
  WHERE question_id = q_id;
  UPDATE life_exam_questions
  SET label = 'あなたの現在の個人年収はいくらですか？'
  WHERE id = q_id;
END IF;

-- Q2: 5年後見込み (max 40→30)
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 2 AND sort_order = 2 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  UPDATE life_exam_answers
  SET value_numeric = CASE value_numeric
    WHEN 40 THEN 30
    WHEN 30 THEN 22
    WHEN 20 THEN 14
    WHEN 10 THEN  7
    WHEN  0 THEN  0
    ELSE value_numeric
  END
  WHERE question_id = q_id AND value_numeric IN (40, 30, 20, 10);
END IF;

-- Q3: スキル希少性 (max 40→30)
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 2 AND sort_order = 3 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  UPDATE life_exam_answers
  SET value_numeric = CASE value_numeric
    WHEN 40 THEN 30
    WHEN 30 THEN 22
    WHEN 20 THEN 15
    WHEN 10 THEN  7
    WHEN  0 THEN  0
    ELSE value_numeric
  END
  WHERE question_id = q_id AND value_numeric IN (40, 30, 20, 10);
END IF;

-- Q4: 収入源 (max 30→20)
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 2 AND sort_order = 4 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  UPDATE life_exam_answers
  SET value_numeric = CASE value_numeric
    WHEN 30 THEN 20
    WHEN 20 THEN 14
    WHEN 10 THEN  7
    WHEN  0 THEN  0
    ELSE value_numeric
  END
  WHERE question_id = q_id AND value_numeric IN (30, 20, 10);
END IF;

-- Q5: 収入裁量 (max 40→20)
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 2 AND sort_order = 5 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  UPDATE life_exam_answers
  SET value_numeric = CASE value_numeric
    WHEN 40 THEN 20
    WHEN 30 THEN 15
    WHEN 20 THEN 10
    WHEN 10 THEN  5
    WHEN  0 THEN  0
    ELSE value_numeric
  END
  WHERE question_id = q_id AND value_numeric IN (40, 30, 20, 10);
END IF;

-- ════════════════════════════════════════════════════════
-- 3. 人間関係（subject_id=3）
--    4カテゴリ均等化（恋愛/友人/家族/ブリッジング 各50pt）
--    既存回答は互換性なし → 全削除してラベル更新のみ
-- ════════════════════════════════════════════════════════

-- 既存回答をすべて削除
DELETE FROM life_exam_answers
WHERE question_id IN (
  SELECT id FROM life_exam_questions
  WHERE subject_id = 3 AND response_type = 'v2'
);

-- Q1〜Q13 ラベル更新
UPDATE life_exam_questions SET label = '【恋愛Q1】現在の恋愛・パートナー関係の状況は？'
  WHERE subject_id = 3 AND sort_order = 1  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【恋愛Q2】最も親密な関係で、本音や弱みを見せられますか？（対象：パートナー・最も近い異性）'
  WHERE subject_id = 3 AND sort_order = 2  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【恋愛Q3】恋愛・パートナーシップに関する孤独感や不満を感じますか？'
  WHERE subject_id = 3 AND sort_order = 3  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【友人Q1】何でも本音で相談できる友人は何人いますか？'
  WHERE subject_id = 3 AND sort_order = 4  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【友人Q2】緊急時に無条件で助けてくれる友人はいますか？'
  WHERE subject_id = 3 AND sort_order = 5  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【友人Q3】友人との関係の深さ・頻度はどうですか？'
  WHERE subject_id = 3 AND sort_order = 6  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【家族Q1】家族（親・兄弟・配偶者・子など）との関係は？'
  WHERE subject_id = 3 AND sort_order = 7  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【家族Q2】困ったとき、家族に本音で頼れますか？'
  WHERE subject_id = 3 AND sort_order = 8  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【家族Q3】家族から精神的サポートを受けていると感じますか？'
  WHERE subject_id = 3 AND sort_order = 9  AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【ブリッジングQ1】会社・学校以外で継続的に関わるコミュニティはありますか？'
  WHERE subject_id = 3 AND sort_order = 10 AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【ブリッジングQ2】自分とは異なる業界・価値観の人と定期的に交流がありますか？'
  WHERE subject_id = 3 AND sort_order = 11 AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【ブリッジングQ3】新しい出会いはどの程度ありますか？'
  WHERE subject_id = 3 AND sort_order = 12 AND response_type = 'v2';
UPDATE life_exam_questions SET label = '【ブリッジングQ4】あなたは他者に新しい情報や機会を提供できますか？'
  WHERE subject_id = 3 AND sort_order = 13 AND response_type = 'v2';

-- Q14 削除（新設問は13問）
SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 3 AND sort_order = 14 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  DELETE FROM life_exam_answers WHERE question_id = q_id;
  DELETE FROM life_exam_questions WHERE id = q_id;
END IF;

-- ════════════════════════════════════════════════════════
-- 4. 時間（subject_id=4）Q1 労働時間スケール変更
--    旧4択: 25/20/3/0 → 新6択: 25/22/18/12/5/0
--    旧回答を保守的にマッピング（実際の時間は不明なため短い方向で推定）
-- ════════════════════════════════════════════════════════

SELECT id INTO q_id
FROM life_exam_questions WHERE subject_id = 4 AND sort_order = 1 AND response_type = 'v2';
IF q_id IS NOT NULL THEN
  UPDATE life_exam_answers
  SET value_numeric = CASE value_numeric
    WHEN 25 THEN 18   -- 旧「35h未満」→ 新「35〜40h」（保守的）
    WHEN 20 THEN 12   -- 旧「35〜45h」→ 新「41〜45h」
    WHEN  3 THEN  5   -- 旧「46〜55h」→ 新「46〜55h」
    WHEN  0 THEN  0   -- 旧「56h以上」→ 変更なし
    ELSE value_numeric
  END
  WHERE question_id = q_id AND value_numeric IN (25, 20, 3, 0);
  UPDATE life_exam_questions
  SET label = '【可処分Q1】週の労働時間（残業含む）'
  WHERE id = q_id;
END IF;

-- ════════════════════════════════════════════════════════
-- 5. スコア再計算（資産・収入・時間のみ。人間関係は既存値維持）
-- ════════════════════════════════════════════════════════

-- 資産スコア再計算（subject_id=1, max=200）
UPDATE life_exam_scores ls
SET score = ROUND(LEAST(100, GREATEST(0,
  COALESCE(sub.raw_total, 0)::numeric / 200.0 * 100
)), 2)
FROM (
  SELECT a.attempt_id, SUM(a.value_numeric) AS raw_total
  FROM life_exam_answers a
  JOIN life_exam_questions q ON q.id = a.question_id
  WHERE q.subject_id = 1 AND q.response_type = 'v2'
  GROUP BY a.attempt_id
) sub
WHERE ls.attempt_id = sub.attempt_id AND ls.subject_id = 1;

-- 収入スコア再計算（subject_id=2, max=200）
UPDATE life_exam_scores ls
SET score = ROUND(LEAST(100, GREATEST(0,
  COALESCE(sub.raw_total, 0)::numeric / 200.0 * 100
)), 2)
FROM (
  SELECT a.attempt_id, SUM(a.value_numeric) AS raw_total
  FROM life_exam_answers a
  JOIN life_exam_questions q ON q.id = a.question_id
  WHERE q.subject_id = 2 AND q.response_type = 'v2'
  GROUP BY a.attempt_id
) sub
WHERE ls.attempt_id = sub.attempt_id AND ls.subject_id = 2;

-- 時間スコア再計算（subject_id=4, max=200）
UPDATE life_exam_scores ls
SET score = ROUND(LEAST(100, GREATEST(0,
  COALESCE(sub.raw_total, 0)::numeric / 200.0 * 100
)), 2)
FROM (
  SELECT a.attempt_id, SUM(a.value_numeric) AS raw_total
  FROM life_exam_answers a
  JOIN life_exam_questions q ON q.id = a.question_id
  WHERE q.subject_id = 4 AND q.response_type = 'v2'
  GROUP BY a.attempt_id
) sub
WHERE ls.attempt_id = sub.attempt_id AND ls.subject_id = 4;

-- ════════════════════════════════════════════════════════
-- 6. total_score・deviation_value 再計算
-- ════════════════════════════════════════════════════════

UPDATE life_exam_attempts a
SET
  total_score     = sub.new_total,
  deviation_value = LEAST(100, GREATEST(0, ROUND(
    (50 + (sub.new_total / 5.0 - 50) * 0.6)::numeric, 2
  )))
FROM (
  SELECT attempt_id, SUM(score) AS new_total
  FROM life_exam_scores
  GROUP BY attempt_id
) sub
WHERE a.id = sub.attempt_id;

-- ════════════════════════════════════════════════════════
-- 7. ランク再計算
-- ════════════════════════════════════════════════════════

PERFORM life_exam_recompute_all_ranks();

RAISE NOTICE 'v3設問改訂マイグレーション完了。';
RAISE NOTICE '注意: 人間関係の既存回答は削除済み。社会資本スコアは旧値を維持。';
RAISE NOTICE '推奨: seedデータを再生成して母集団統計を更新してください。';

END;
$$;
