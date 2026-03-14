-- aspiration_type_at_attempt が存在しない環境向け（スキーマキャッシュエラー対策）

ALTER TABLE life_exam_attempts
  ADD COLUMN IF NOT EXISTS aspiration_type_at_attempt text;

COMMENT ON COLUMN life_exam_attempts.aspiration_type_at_attempt IS '当該受験時の志望タイプ（倍率算出用）';
