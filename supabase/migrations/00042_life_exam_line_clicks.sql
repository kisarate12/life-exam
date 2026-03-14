-- LINE誘導クリック記録（診断結果ページからLINEへ遷移したタイミングで attempt_id / user_id を保存し、回答情報をDB上で紐づけ可能にする）
CREATE TABLE life_exam_line_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES life_exam_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_name text,
  world text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_life_exam_line_clicks_attempt ON life_exam_line_clicks(attempt_id);
CREATE INDEX idx_life_exam_line_clicks_user ON life_exam_line_clicks(user_id);
CREATE INDEX idx_life_exam_line_clicks_clicked_at ON life_exam_line_clicks(clicked_at DESC);

COMMENT ON TABLE life_exam_line_clicks IS '結果ページからLINE公式へ遷移した際のクリック記録。attempt_id で life_exam_attempts / 回答と紐づく';

ALTER TABLE life_exam_line_clicks ENABLE ROW LEVEL SECURITY;

-- 記録用: 誰でも insert 可能（attempt_id を知っている＝結果ページを見ているユーザー）
CREATE POLICY "Allow insert line clicks" ON life_exam_line_clicks
  FOR INSERT WITH CHECK (true);

-- 参照: 自ユーザー分のみ select 可能（必要なら後でサービスロールのみに変更可）
CREATE POLICY "Users can read own line clicks" ON life_exam_line_clicks
  FOR SELECT USING (auth.uid() = user_id);
