-- 設問差し替えに備えた version 管理（Ver1 = '1'）

ALTER TABLE life_exam_attempts
  ADD COLUMN IF NOT EXISTS exam_version text NOT NULL DEFAULT '1';

COMMENT ON COLUMN life_exam_attempts.exam_version IS '設問セットのバージョン（Ver1=1）。将来の差し替え時に利用';