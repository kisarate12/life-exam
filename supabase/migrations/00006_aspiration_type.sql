-- 志望タイプ(A〜E)：プロフィールと受験時に保持（倍率・偏差値で利用予定）

ALTER TABLE life_exam_profiles
  ADD COLUMN IF NOT EXISTS aspiration_type text;

ALTER TABLE life_exam_attempts
  ADD COLUMN IF NOT EXISTS aspiration_type_at_attempt text;

COMMENT ON COLUMN life_exam_profiles.aspiration_type IS '志望タイプ A〜E（受験時のデフォルト）';
COMMENT ON COLUMN life_exam_attempts.aspiration_type_at_attempt IS '当該受験時の志望タイプ（倍率算出用）';
