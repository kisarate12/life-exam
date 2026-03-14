-- 人生の全国共通テスト（Life Exam） Phase1: DB設計
-- 拡張前提: 年齢バンド・母集団統計・z-score 対応を想定

-- =============================================================================
-- 1. 科目マスタ（5科目・各100点・総合500点）
-- =============================================================================
CREATE TABLE life_exam_subjects (
  id smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code text NOT NULL UNIQUE,
  name_ja text NOT NULL
);

COMMENT ON TABLE life_exam_subjects IS '5科目: 金融・人的・社会・時間・心理資本';
INSERT INTO life_exam_subjects (code, name_ja) VALUES
  ('financial', '金融資本'),
  ('human', '人的資本'),
  ('social', '社会資本'),
  ('time', '時間資本'),
  ('psychological', '心理資本');

-- =============================================================================
-- 2. 設問マスタ（25問・科目紐づけ）拡張用
-- =============================================================================
CREATE TABLE life_exam_questions (
  id smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  subject_id smallint NOT NULL REFERENCES life_exam_subjects(id),
  sort_order smallint NOT NULL,
  label text NOT NULL,
  response_type text NOT NULL DEFAULT 'numeric',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_life_exam_questions_subject_order ON life_exam_questions(subject_id, sort_order);
COMMENT ON TABLE life_exam_questions IS '25問アンケート。MVP後でラベル変更可能';

-- 25問シード（各科目5問・拡張前提でラベルは後から更新可）
INSERT INTO life_exam_questions (subject_id, sort_order, label) VALUES
  (1, 1, '設問1'), (1, 2, '設問2'), (1, 3, '設問3'), (1, 4, '設問4'), (1, 5, '設問5'),
  (2, 1, '設問6'), (2, 2, '設問7'), (2, 3, '設問8'), (2, 4, '設問9'), (2, 5, '設問10'),
  (3, 1, '設問11'), (3, 2, '設問12'), (3, 3, '設問13'), (3, 4, '設問14'), (3, 5, '設問15'),
  (4, 1, '設問16'), (4, 2, '設問17'), (4, 3, '設問18'), (4, 4, '設問19'), (4, 5, '設問20'),
  (5, 1, '設問21'), (5, 2, '設問22'), (5, 3, '設問23'), (5, 4, '設問24'), (5, 5, '設問25');

-- =============================================================================
-- 3. ユーザー基本情報（年齢バンドは将来の同世代順位・偏差値用）
-- =============================================================================
CREATE TABLE life_exam_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_year int,
  age_band text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN life_exam_profiles.age_band IS '将来の年齢別分布用。例: 20-24, 25-29';
COMMENT ON TABLE life_exam_profiles IS '基本情報。年齢バンドは集計・偏差値拡張用';

-- =============================================================================
-- 4. 受験1回分（総合・偏差値・合否・順位）
-- =============================================================================
CREATE TABLE life_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age_band_at_attempt text,
  total_score numeric(5,2) NOT NULL,
  deviation_value numeric(5,2) NOT NULL,
  passed boolean NOT NULL,
  national_rank int,
  same_gen_rank int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_life_exam_attempts_user ON life_exam_attempts(user_id);
CREATE INDEX idx_life_exam_attempts_created ON life_exam_attempts(created_at DESC);
COMMENT ON COLUMN life_exam_attempts.deviation_value IS '暫定式: 50 + (total_score - 50) * 0.5。将来は母集団からz-score';
COMMENT ON COLUMN life_exam_attempts.national_rank IS '仮順位。将来はPostgres集計で算出';

-- =============================================================================
-- 5. 回答（1受験 = 25行）
-- =============================================================================
CREATE TABLE life_exam_answers (
  attempt_id uuid NOT NULL REFERENCES life_exam_attempts(id) ON DELETE CASCADE,
  question_id smallint NOT NULL REFERENCES life_exam_questions(id),
  value_numeric numeric(10,4),
  value_text text,
  PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX idx_life_exam_answers_attempt ON life_exam_answers(attempt_id);

-- =============================================================================
-- 6. 科目別スコア（1受験 = 5行）
-- =============================================================================
CREATE TABLE life_exam_scores (
  attempt_id uuid NOT NULL REFERENCES life_exam_attempts(id) ON DELETE CASCADE,
  subject_id smallint NOT NULL REFERENCES life_exam_subjects(id),
  score numeric(5,2) NOT NULL,
  PRIMARY KEY (attempt_id, subject_id)
);

CREATE INDEX idx_life_exam_scores_attempt ON life_exam_scores(attempt_id);

-- =============================================================================
-- 7. 母集団統計（将来の偏差値＝z-score用・Postgres集計想定）
-- =============================================================================
CREATE TABLE life_exam_population_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  age_band_min int,
  age_band_max int,
  subject_id smallint REFERENCES life_exam_subjects(id),
  mean numeric(12,4) NOT NULL,
  stddev numeric(12,4) NOT NULL,
  sample_count int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_life_exam_population_stats_band_subject
  ON life_exam_population_stats(age_band_min, age_band_max, subject_id);
COMMENT ON TABLE life_exam_population_stats IS 'subject_id NULL = 総合。将来の偏差値計算用';

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE life_exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_exam_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_exam_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_exam_population_stats ENABLE ROW LEVEL SECURITY;

-- マスタ: 全員読み取りのみ
CREATE POLICY "life_exam_subjects_read" ON life_exam_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "life_exam_questions_read" ON life_exam_questions FOR SELECT TO authenticated USING (true);

-- 自分のプロフィールのみ
CREATE POLICY "life_exam_profiles_own" ON life_exam_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 自分の受験のみ
CREATE POLICY "life_exam_attempts_own" ON life_exam_attempts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 自分の受験に紐づく回答のみ
CREATE POLICY "life_exam_answers_own" ON life_exam_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM life_exam_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM life_exam_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));

-- 自分の受験に紐づくスコアのみ
CREATE POLICY "life_exam_scores_own" ON life_exam_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM life_exam_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM life_exam_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));

-- 母集団統計: 全員読み取り（集計はサービスロールで投入）
CREATE POLICY "life_exam_population_stats_read" ON life_exam_population_stats FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- updated_at トリガー（profiles）
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER life_exam_profiles_updated_at
  BEFORE UPDATE ON life_exam_profiles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
