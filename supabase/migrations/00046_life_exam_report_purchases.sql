-- 有料レポート購入履歴テーブル
-- attempt_id 単位で一回払いの購入を管理する
-- 購入後はリンクを知っていれば誰でも閲覧可能（attempt_id をURLに含める設計）
CREATE TABLE IF NOT EXISTS life_exam_report_purchases (
  attempt_id              uuid        PRIMARY KEY REFERENCES life_exam_attempts(id),
  stripe_session_id       text        NOT NULL,
  stripe_payment_intent_id text,
  paid_at                 timestamptz NOT NULL DEFAULT now(),
  amount_yen              int         NOT NULL DEFAULT 980,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- RLS 有効化
ALTER TABLE life_exam_report_purchases ENABLE ROW LEVEL SECURITY;

-- 誰でも購入済みか確認できる（未ログインユーザーが report ページを開くケースのため）
CREATE POLICY "public_read_report_purchases"
  ON life_exam_report_purchases
  FOR SELECT
  USING (true);

-- INSERT / UPDATE は service_role のみ（Stripe webhook が使用）
-- service_role は RLS を bypass するので追加ポリシー不要
