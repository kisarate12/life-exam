-- ============================================================
-- 相談返信ダッシュボード スキーマ
-- ============================================================

-- connections: プラットフォームの OAuth 接続情報
CREATE TABLE IF NOT EXISTS connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('gmail', 'slack', 'google_chat')),
  -- 暗号化済みトークン (AES-256-GCM の base64 エンコード文字列)
  access_token_enc   TEXT,
  refresh_token_enc  TEXT,
  -- プラットフォーム固有識別子 (Slack: team_id, Google: sub 等)
  platform_account_id TEXT,
  extra_data  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- consultations: 1件の相談
CREATE TABLE IF NOT EXISTS consultations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id       UUID REFERENCES connections(id) ON DELETE SET NULL,
  platform            TEXT NOT NULL CHECK (platform IN ('gmail', 'slack', 'google_chat')),
  sender_display      TEXT NOT NULL DEFAULT '',
  body                TEXT NOT NULL DEFAULT '',
  -- プラットフォーム固有 ID (重複判定用)
  platform_thread_id  TEXT,
  platform_message_id TEXT NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- platform + message_id で一意
  UNIQUE (platform, platform_message_id)
);

-- drafts: AI 生成下書き (consultations と 1:1)
CREATE TABLE IF NOT EXISTS drafts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id  UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  body             TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consultation_id)
);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts        ENABLE ROW LEVEL SECURITY;

-- connections: 本人のみ
CREATE POLICY "connections_own" ON connections
  USING (user_id = auth.uid());

-- consultations: 本人の connection に紐づくもの
CREATE POLICY "consultations_own" ON consultations
  USING (
    connection_id IN (
      SELECT id FROM connections WHERE user_id = auth.uid()
    )
  );

-- drafts: 本人の consultation に紐づくもの
CREATE POLICY "drafts_own" ON drafts
  USING (
    consultation_id IN (
      SELECT c.id FROM consultations c
      JOIN connections conn ON conn.id = c.connection_id
      WHERE conn.user_id = auth.uid()
    )
  );
