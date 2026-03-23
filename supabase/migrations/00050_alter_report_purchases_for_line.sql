-- LINE登録による無料解放に対応するため、stripe_session_id を NULL 許容にし、
-- unlock_method カラムを追加する
ALTER TABLE life_exam_report_purchases
  ALTER COLUMN stripe_session_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS unlock_method TEXT NOT NULL DEFAULT 'stripe'
    CHECK (unlock_method IN ('stripe', 'line'));
