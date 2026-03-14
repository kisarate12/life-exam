-- 人生審査：科目表示名を変更
-- 人的資本→収入、金融資本→資産、社会資本→人間関係、時間資本→時間、健康資本→健康

UPDATE life_exam_subjects SET name_ja = '資産' WHERE code = 'financial';
UPDATE life_exam_subjects SET name_ja = '収入' WHERE code = 'human';
UPDATE life_exam_subjects SET name_ja = '人間関係' WHERE code = 'social';
UPDATE life_exam_subjects SET name_ja = '時間' WHERE code = 'time';
UPDATE life_exam_subjects SET name_ja = '健康' WHERE code = 'psychological';
