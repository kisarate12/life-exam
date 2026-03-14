-- 金融資本 1問目：金融資産 → 保有資産全体（不動産含む）に文言変更
UPDATE life_exam_questions
SET label = '現在の保有資産はいくらですか？（金融資産・不動産などすべての資産の合計）'
WHERE subject_id = 1 AND sort_order = 1 AND response_type = 'v2';
