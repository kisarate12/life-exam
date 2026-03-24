-- 発行コード（レポート解放トークン）テーブル
-- LINE経由でレポートを解放する際に使用する6文字トークンを管理する
CREATE TABLE IF NOT EXISTS life_exam_report_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      text        UNIQUE NOT NULL,       -- 6文字英数大文字（例: ABCD12）
  attempt_id uuid        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,              -- 作成から24時間後
  used_at    timestamptz                        -- 使用済み日時（NULLなら未使用）
);

CREATE INDEX IF NOT EXISTS life_exam_report_tokens_token_idx ON life_exam_report_tokens(token);

ALTER TABLE life_exam_report_tokens ENABLE ROW LEVEL SECURITY;
-- INSERT / SELECT / UPDATE は service_role のみ（RLS bypass）
