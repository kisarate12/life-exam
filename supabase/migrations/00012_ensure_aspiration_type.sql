-- aspiration_type が存在しない環境向け（スキーマキャッシュエラー対策）
-- 00006 と重複するが、IF NOT EXISTS で安全に再実行可能

ALTER TABLE life_exam_profiles
  ADD COLUMN IF NOT EXISTS aspiration_type text;

COMMENT ON COLUMN life_exam_profiles.aspiration_type IS '志望タイプ A〜E（受験時のデフォルト）';
