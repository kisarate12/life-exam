-- gender_at_attempt が存在しない環境向け（スキーマキャッシュエラー対策）

ALTER TABLE life_exam_attempts
  ADD COLUMN IF NOT EXISTS gender_at_attempt text;

COMMENT ON COLUMN life_exam_attempts.gender_at_attempt IS '受験時プロフィールの性別（male/female/other）。順位集計のコホート用';
