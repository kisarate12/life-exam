-- 00049: 収入Q1（個人年収）のスコア配分を引き上げ
-- examV2Questions.ts の点数変更に合わせ、既存回答を再計算する
--
-- 旧 → 新
--   0  → 0  (無収入, 変更なし)
--   5  → 8  (400万未満)
--  10  → 18 (400〜599万)
--  20  → 28 (600〜799万)
--  30  → 35 (800〜999万)
--  40  → 42 (1000〜1499万)
--  45  → 46 (1500〜1999万)
--  50  → 50 (2000万以上, 変更なし)

DO $$
DECLARE
  income_q1_id integer;
BEGIN
  -- subject_id=2, sort_order=1 の question_id を取得
  SELECT id INTO income_q1_id
  FROM life_exam_questions
  WHERE subject_id = 2 AND sort_order = 1 AND response_type = 'v2'
  LIMIT 1;

  IF income_q1_id IS NULL THEN
    RAISE NOTICE '収入Q1が見つかりませんでした。スキップします。';
    RETURN;
  END IF;

  -- ================================================================
  -- Step 1: life_exam_answers の value_numeric を新しい点数に更新
  -- ================================================================
  UPDATE life_exam_answers
  SET value_numeric = CASE value_numeric
    WHEN 5  THEN 8
    WHEN 10 THEN 18
    WHEN 20 THEN 28
    WHEN 30 THEN 35
    WHEN 40 THEN 42
    WHEN 45 THEN 46
    ELSE value_numeric  -- 0 / 50 は変更なし
  END
  WHERE question_id = income_q1_id
    AND value_numeric IN (5, 10, 20, 30, 40, 45);

  -- ================================================================
  -- Step 2: subject 2 のスコアを再計算
  --         （収入Q1を持つ attempt のみ。シードデータは answers 未登録のため影響なし）
  -- ================================================================
  UPDATE life_exam_scores ls
  SET score = sub.new_score
  FROM (
    SELECT
      ans.attempt_id,
      ROUND(LEAST(100, GREATEST(0,
        SUM(ans.value_numeric)::numeric / 200.0 * 100
      )), 2) AS new_score
    FROM life_exam_answers ans
    JOIN life_exam_questions q ON q.id = ans.question_id
    WHERE q.subject_id = 2 AND q.response_type = 'v2'
    GROUP BY ans.attempt_id
  ) sub
  WHERE ls.attempt_id = sub.attempt_id
    AND ls.subject_id = 2;

  -- ================================================================
  -- Step 3: total_score・deviation_value を再計算
  -- ================================================================
  UPDATE life_exam_attempts a
  SET
    total_score     = sub.new_total,
    deviation_value = LEAST(100, GREATEST(0, ROUND(
      (50 + (sub.new_total / 5.0 - 50) * 0.6)::numeric
    , 2)))
  FROM (
    SELECT attempt_id, SUM(score) AS new_total
    FROM life_exam_scores
    GROUP BY attempt_id
  ) sub
  WHERE a.id = sub.attempt_id
    AND EXISTS (
      SELECT 1 FROM life_exam_answers
      WHERE attempt_id = a.id AND question_id = income_q1_id
    );

  -- ================================================================
  -- Step 4: 順位・passed を再計算
  -- ================================================================
  PERFORM life_exam_recompute_all_ranks();

  RAISE NOTICE '収入Q1スコア引き上げ完了。既存の実ユーザー回答を再計算しました。';
END;
$$;
