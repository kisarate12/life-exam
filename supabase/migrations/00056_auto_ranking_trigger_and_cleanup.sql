-- ============================================================
-- 00056: ranking_entries 自動生成トリガー + DB 構造クリーンアップ
-- ============================================================
-- 変更内容:
--   1. scores INSERT 完了時に ranking_entries を自動 upsert するトリガー
--   2. 既存 attempts で ranking_entries が欠損しているものをバックフィル
--   3. 旧ランク計算トリガー・関数を削除
--   4. attempts から不要な順位系カラム 8 本を削除
--   5. profiles.income_range (未使用) を削除
--   6. report_tokens.attempt_id に FK を追加
--   7. tasks テーブル削除（チュートリアル残骸）
-- ============================================================

-- ============================================================
-- 1. scores INSERT 後に ranking_entries を自動生成するトリガー関数
-- ============================================================
-- scores は 5 行 INSERT されるため、5 科目揃った時点で ranking_entries を upsert する
CREATE OR REPLACE FUNCTION life_exam_auto_ranking_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id     uuid;
  v_total_score numeric;
  v_s1 numeric; v_s2 numeric; v_s3 numeric; v_s4 numeric; v_s5 numeric;
  v_count       int;
BEGIN
  -- 5 科目すべて揃っているか確認
  SELECT count(*) INTO v_count
  FROM life_exam_scores
  WHERE attempt_id = NEW.attempt_id;

  IF v_count < 5 THEN
    RETURN NEW;
  END IF;

  -- attempt から user_id と total_score を取得
  SELECT user_id, total_score INTO v_user_id, v_total_score
  FROM life_exam_attempts
  WHERE id = NEW.attempt_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 5 科目のスコアを取得
  SELECT score INTO v_s1 FROM life_exam_scores WHERE attempt_id = NEW.attempt_id AND subject_id = 1;
  SELECT score INTO v_s2 FROM life_exam_scores WHERE attempt_id = NEW.attempt_id AND subject_id = 2;
  SELECT score INTO v_s3 FROM life_exam_scores WHERE attempt_id = NEW.attempt_id AND subject_id = 3;
  SELECT score INTO v_s4 FROM life_exam_scores WHERE attempt_id = NEW.attempt_id AND subject_id = 4;
  SELECT score INTO v_s5 FROM life_exam_scores WHERE attempt_id = NEW.attempt_id AND subject_id = 5;

  -- ranking_entries に upsert（キャラクター判定は既存の DB 関数を利用）
  INSERT INTO life_exam_ranking_entries (
    attempt_id, user_id, nickname,
    world, character_name, character_image,
    total_score
  )
  SELECT
    NEW.attempt_id,
    v_user_id,
    '名無しの冒険者',
    wc.world_short,
    wc.character_name,
    wc.character_image,
    ROUND((v_total_score / 500.0 * 900))::numeric(6,0)
  FROM life_exam_get_world_and_character(v_s1, v_s2, v_s3, v_s4, v_s5) wc
  ON CONFLICT (attempt_id) DO UPDATE SET
    world           = EXCLUDED.world,
    character_name  = EXCLUDED.character_name,
    character_image = EXCLUDED.character_image,
    total_score     = EXCLUDED.total_score,
    updated_at      = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_life_exam_auto_ranking
  AFTER INSERT ON life_exam_scores
  FOR EACH ROW
  EXECUTE FUNCTION life_exam_auto_ranking_entry();

-- ============================================================
-- 2. 既存データのバックフィル（ranking_entries が欠損している attempts を補完）
-- ============================================================
INSERT INTO life_exam_ranking_entries (
  attempt_id, user_id, nickname,
  world, character_name, character_image,
  total_score
)
SELECT
  a.id,
  a.user_id,
  '名無しの冒険者',
  wc.world_short,
  wc.character_name,
  wc.character_image,
  ROUND((a.total_score / 500.0 * 900))::numeric(6,0)
FROM life_exam_attempts a
JOIN life_exam_scores s1 ON s1.attempt_id = a.id AND s1.subject_id = 1
JOIN life_exam_scores s2 ON s2.attempt_id = a.id AND s2.subject_id = 2
JOIN life_exam_scores s3 ON s3.attempt_id = a.id AND s3.subject_id = 3
JOIN life_exam_scores s4 ON s4.attempt_id = a.id AND s4.subject_id = 4
JOIN life_exam_scores s5 ON s5.attempt_id = a.id AND s5.subject_id = 5
CROSS JOIN LATERAL life_exam_get_world_and_character(
  s1.score, s2.score, s3.score, s4.score, s5.score
) wc
WHERE NOT EXISTS (
  SELECT 1 FROM life_exam_ranking_entries re WHERE re.attempt_id = a.id
);

-- ============================================================
-- 3. 旧ランク計算トリガー・関数を削除（削除するカラムに書き込むため不要）
-- ============================================================
DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;
DROP FUNCTION IF EXISTS life_exam_set_attempt_ranks();
DROP FUNCTION IF EXISTS life_exam_recompute_all_ranks();

-- ============================================================
-- 4. attempts から不要な順位系カラムを削除（RPC で都度計算しているため不要）
-- ============================================================
ALTER TABLE life_exam_attempts
  DROP COLUMN IF EXISTS national_rank,
  DROP COLUMN IF EXISTS national_total,
  DROP COLUMN IF EXISTS same_gen_rank,
  DROP COLUMN IF EXISTS same_gen_total,
  DROP COLUMN IF EXISTS gender_rank,
  DROP COLUMN IF EXISTS gender_total,
  DROP COLUMN IF EXISTS same_gen_gender_rank,
  DROP COLUMN IF EXISTS same_gen_gender_total;

-- ============================================================
-- 5. profiles.income_range を削除（どこからも参照されていない）
-- ============================================================
ALTER TABLE life_exam_profiles
  DROP COLUMN IF EXISTS income_range;

-- ============================================================
-- 6. report_tokens.attempt_id に FK を追加
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'life_exam_report_tokens_attempt_id_fkey'
      AND table_name = 'life_exam_report_tokens'
  ) THEN
    ALTER TABLE life_exam_report_tokens
      ADD CONSTRAINT life_exam_report_tokens_attempt_id_fkey
      FOREIGN KEY (attempt_id) REFERENCES life_exam_attempts(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ============================================================
-- 7. tasks テーブル削除（チュートリアル残骸、人生模試と無関係）
-- ============================================================
DROP TABLE IF EXISTS tasks;
