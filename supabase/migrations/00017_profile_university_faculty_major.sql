-- 基本情報：卒業大学・学部・学科を追加

ALTER TABLE life_exam_profiles
  ADD COLUMN IF NOT EXISTS university_graduated text,
  ADD COLUMN IF NOT EXISTS faculty text,
  ADD COLUMN IF NOT EXISTS major text;

COMMENT ON COLUMN life_exam_profiles.university_graduated IS '卒業大学（任意）';
COMMENT ON COLUMN life_exam_profiles.faculty IS '学部（任意）';
COMMENT ON COLUMN life_exam_profiles.major IS '学科（任意）';
