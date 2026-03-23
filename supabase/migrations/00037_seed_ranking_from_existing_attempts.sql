-- 既存の受験（life_exam_attempts + life_exam_scores）から世界・キャラを算出し、
-- life_exam_ranking_entries に投入。判定ロジックはアプリ（logic.ts）と同一。

-- 科目スコア(0-100)をランク値に変換（S=7, A=6, B=5, C=4, D=3, E=2, F=1）
-- アプリの暫定偏差値 50+(score-50)*0.6 と S〜F 閾値に合わせる
CREATE OR REPLACE FUNCTION life_exam_score_to_rank_val(score numeric)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN score >= 75 THEN 7
    WHEN score >= 67 THEN 6
    WHEN score >= 58 THEN 5
    WHEN score >= 50 THEN 4
    WHEN score >= 46 THEN 3
    WHEN score >= 40 THEN 2
    ELSE 1
  END::int;
$$;

-- 既存受験の科目スコアから世界（短縮名）とキャラ名・画像パスを返す
-- subject_id: 1=資産, 2=収入, 3=人間関係, 4=時間, 5=健康
-- 上から順に16キャラを判定（仕様・logic.ts と同一）
CREATE OR REPLACE FUNCTION life_exam_get_world_and_character(
  p_s1 numeric, p_s2 numeric, p_s3 numeric, p_s4 numeric, p_s5 numeric
)
RETURNS TABLE(world_short text, character_name text, character_image text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r1 int; r2 int; r3 int; r4 int; r5 int;
  fr int;  -- 金融 = max(資産,収入)
  health_or_rel_only boolean;  -- 健康S〜Bかつ人間関係C〜F の XOR
  both_bad boolean;   -- 健康C〜F かつ 人間関係C〜F
  both_good boolean;  -- 健康S〜B かつ 人間関係S〜B
BEGIN
  r1 := life_exam_score_to_rank_val(p_s1);
  r2 := life_exam_score_to_rank_val(p_s2);
  r3 := life_exam_score_to_rank_val(p_s3);
  r4 := life_exam_score_to_rank_val(p_s4);
  r5 := life_exam_score_to_rank_val(p_s5);
  fr := GREATEST(r1, r2);
  health_or_rel_only := (r5 >= 5 AND r3 <= 4) OR (r5 <= 4 AND r3 >= 5);
  both_bad := r5 <= 4 AND r3 <= 4;
  both_good := r5 >= 5 AND r3 >= 5;

  -- 空の世界（金融S〜B かつ 時間S〜B）
  IF fr >= 5 AND r4 >= 5 THEN
    IF r1 >= 5 AND r5 >= 5 AND r3 >= 5 AND r4 >= 5 THEN
      RETURN QUERY SELECT '空'::text, 'アマテラスオオミカミ'::text, '/life-diagnosis/characters/アマテラスオオミカミ.png'::text;
      RETURN;
    END IF;
    IF r2 >= 5 AND r1 <= 4 AND r5 >= 5 AND r3 >= 5 AND r4 >= 5 THEN
      RETURN QUERY SELECT '空'::text, '大将軍'::text, '/life-diagnosis/characters/大将軍.png'::text;
      RETURN;
    END IF;
    IF health_or_rel_only AND r4 >= 5 THEN
      RETURN QUERY SELECT '空'::text, '獅子'::text, '/life-diagnosis/characters/獅子.png'::text;
      RETURN;
    END IF;
    IF both_bad AND r4 >= 5 THEN
      RETURN QUERY SELECT '空'::text, 'カイコ'::text, '/life-diagnosis/characters/カイコ.png'::text;
      RETURN;
    END IF;
  END IF;

  -- 海の世界（金融C〜F かつ 時間S〜B）
  IF fr <= 4 AND r4 >= 5 THEN
    IF fr = 4 AND r5 >= 5 AND r3 >= 5 AND r4 >= 5 THEN
      RETURN QUERY SELECT '海'::text, 'ツクヨミ'::text, '/life-diagnosis/characters/ツクヨミ.png'::text;
      RETURN;
    END IF;
    IF fr <= 3 AND r5 >= 5 AND r3 >= 5 AND r4 >= 5 THEN
      RETURN QUERY SELECT '海'::text, '下流貴族'::text, '/life-diagnosis/characters/下流貴族.png'::text;
      RETURN;
    END IF;
    IF health_or_rel_only AND r4 >= 5 THEN
      RETURN QUERY SELECT '海'::text, '頭痛の亀'::text, '/life-diagnosis/characters/頭痛の亀.png'::text;
      RETURN;
    END IF;
    IF both_bad AND r4 >= 5 THEN
      RETURN QUERY SELECT '海'::text, 'カタツムリ'::text, '/life-diagnosis/characters/カタツムリ.png'::text;
      RETURN;
    END IF;
  END IF;

  -- 地上の世界（金融S〜B かつ 時間C〜F）
  IF fr >= 5 AND r4 <= 4 THEN
    IF both_good AND r4 = 4 THEN
      RETURN QUERY SELECT '地上'::text, 'ドワーフの王'::text, '/life-diagnosis/characters/ドワーフの王.png'::text;
      RETURN;
    END IF;
    IF both_good AND r4 <= 3 THEN
      RETURN QUERY SELECT '地上'::text, '騎士'::text, '/life-diagnosis/characters/騎士.png'::text;
      RETURN;
    END IF;
    IF health_or_rel_only AND r4 <= 4 THEN
      RETURN QUERY SELECT '地上'::text, 'タヌキ'::text, '/life-diagnosis/characters/タヌキ.png'::text;
      RETURN;
    END IF;
    IF both_bad AND r4 <= 4 THEN
      RETURN QUERY SELECT '地上'::text, 'フンコロガシ'::text, '/life-diagnosis/characters/フンコロガシ.png'::text;
      RETURN;
    END IF;
  END IF;

  -- 冥界（金融C〜F かつ 時間C〜F）
  IF fr <= 4 AND r4 <= 4 THEN
    IF fr = 4 AND r5 >= 5 AND r3 >= 5 AND r4 <= 4 THEN
      RETURN QUERY SELECT '冥界'::text, 'オークの族長'::text, '/life-diagnosis/characters/オークの族長.png'::text;
      RETURN;
    END IF;
    IF fr <= 3 AND r5 >= 5 AND r3 >= 5 AND r4 <= 4 THEN
      RETURN QUERY SELECT '冥界'::text, '農奴'::text, '/life-diagnosis/characters/農奴.png'::text;
      RETURN;
    END IF;
    IF health_or_rel_only AND r4 <= 4 THEN
      RETURN QUERY SELECT '冥界'::text, 'ハイエナ'::text, '/life-diagnosis/characters/ハイエナ.png'::text;
      RETURN;
    END IF;
    IF both_bad AND r4 <= 4 THEN
      RETURN QUERY SELECT '冥界'::text, '蚊'::text, '/life-diagnosis/characters/蚊.png'::text;
      RETURN;
    END IF;
  END IF;

  -- フォールバック（理論上は必ずどれかに入る）
  RETURN QUERY SELECT '冥界'::text, '蚊'::text, '/life-diagnosis/characters/蚊.png'::text;
END;
$$;

-- 既存の exam_version='2' かつ 5科目スコアが揃っている受験をランキングに登録（重複はスキップ）
INSERT INTO life_exam_ranking_entries (
  attempt_id,
  user_id,
  nickname,
  world,
  character_name,
  character_image,
  total_score
)
SELECT
  a.id,
  a.user_id,
  '名無しの冒険者',
  wc.world_short,
  wc.character_name,
  wc.character_image,
  ROUND((a.total_score / 500.0) * 900)::numeric(6,0)
FROM life_exam_attempts a
JOIN LATERAL (
  SELECT
    MAX(CASE WHEN s.subject_id = 1 THEN s.score END) AS s1,
    MAX(CASE WHEN s.subject_id = 2 THEN s.score END) AS s2,
    MAX(CASE WHEN s.subject_id = 3 THEN s.score END) AS s3,
    MAX(CASE WHEN s.subject_id = 4 THEN s.score END) AS s4,
    MAX(CASE WHEN s.subject_id = 5 THEN s.score END) AS s5
  FROM life_exam_scores s
  WHERE s.attempt_id = a.id
    AND s.subject_id BETWEEN 1 AND 5
  HAVING COUNT(*) = 5
) sc ON true
JOIN LATERAL life_exam_get_world_and_character(
  COALESCE(sc.s1, 50),
  COALESCE(sc.s2, 50),
  COALESCE(sc.s3, 50),
  COALESCE(sc.s4, 50),
  COALESCE(sc.s5, 50)
) wc ON true
WHERE a.exam_version = '2'
  AND NOT EXISTS (SELECT 1 FROM life_exam_ranking_entries r WHERE r.attempt_id = a.id)
ON CONFLICT (attempt_id) DO NOTHING;
