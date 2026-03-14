-- 同大学卒業比較用：受験時点の卒業大学を attempt に持たせる
ALTER TABLE life_exam_attempts
  ADD COLUMN IF NOT EXISTS university_at_attempt text;

COMMENT ON COLUMN life_exam_attempts.university_at_attempt IS '受験時点の卒業大学（profile.university_graduated のスナップショット）。同大学比較・シード用';

CREATE INDEX IF NOT EXISTS idx_life_exam_attempts_university ON life_exam_attempts(university_at_attempt) WHERE university_at_attempt IS NOT NULL;
