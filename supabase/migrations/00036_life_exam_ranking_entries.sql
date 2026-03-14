-- 世界戦闘力ランキング用テーブル（全ユーザーで共有・正しい順位表示のためDBで管理）
-- attempt_id 単位で1件。ニックネーム・世界・キャラ・画像パス・総合点を保存

CREATE TABLE life_exam_ranking_entries (
  attempt_id uuid PRIMARY KEY REFERENCES life_exam_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT '名無しの冒険者',
  world text NOT NULL,
  character_name text NOT NULL,
  character_image text NOT NULL,
  total_score numeric(6,0) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_life_exam_ranking_entries_total_score ON life_exam_ranking_entries(total_score DESC);
CREATE INDEX idx_life_exam_ranking_entries_world ON life_exam_ranking_entries(world, total_score DESC);

COMMENT ON TABLE life_exam_ranking_entries IS 'ランキングに参加した受験のみ。全世界/同世界トップ10・周辺ランキング表示用';

-- RLS: ランキング一覧は誰でも読める。登録・更新は本人のみ
ALTER TABLE life_exam_ranking_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "life_exam_ranking_entries_read" ON life_exam_ranking_entries
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "life_exam_ranking_entries_own" ON life_exam_ranking_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at トリガー
CREATE TRIGGER life_exam_ranking_entries_updated_at
  BEFORE UPDATE ON life_exam_ranking_entries
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
