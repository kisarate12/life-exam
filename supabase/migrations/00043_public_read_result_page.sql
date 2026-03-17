-- 結果ページのシェアリンクを誰でも（匿名含む）閲覧できるようにする
-- 既存の _own ポリシー（INSERT/UPDATE/DELETE）はそのまま残す

-- attempts: 誰でも SELECT 可（attempt_id が分かれば結果を閲覧できる）
CREATE POLICY "life_exam_attempts_public_read"
  ON life_exam_attempts FOR SELECT
  TO anon, authenticated
  USING (true);

-- scores: 誰でも SELECT 可
CREATE POLICY "life_exam_scores_public_read"
  ON life_exam_scores FOR SELECT
  TO anon, authenticated
  USING (true);

-- answers: 誰でも SELECT 可（結果ページで回答詳細を表示するため）
CREATE POLICY "life_exam_answers_public_read"
  ON life_exam_answers FOR SELECT
  TO anon, authenticated
  USING (true);

-- subjects: anon にも SELECT を許可（既存ポリシーは authenticated のみ）
CREATE POLICY "life_exam_subjects_public_read"
  ON life_exam_subjects FOR SELECT
  TO anon
  USING (true);

-- questions: anon にも SELECT を許可
CREATE POLICY "life_exam_questions_public_read"
  ON life_exam_questions FOR SELECT
  TO anon
  USING (true);

-- profiles: 結果ページでプロフィール情報を表示するため、anon にも SELECT を許可
CREATE POLICY "life_exam_profiles_public_read"
  ON life_exam_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- population_stats: anon にも SELECT を許可
CREATE POLICY "life_exam_population_stats_public_read"
  ON life_exam_population_stats FOR SELECT
  TO anon
  USING (true);
