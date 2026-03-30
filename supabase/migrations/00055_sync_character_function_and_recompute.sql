-- ============================================================
-- 00055: キャラクター判定関数をフロントエンドと同期 + 全 ranking_entries 再計算
-- ============================================================
-- 変更内容:
--   1. MFCH 全A超え → アマテラスオオミカミ 分岐は維持
--   2. 冥界 → 闇 に変更（フロントエンド characters.ts と一致）
--   3. 既存の全 ranking_entries を再計算して UPDATE
-- ============================================================

-- ============================================================
-- 1. キャラクター判定関数を更新（フロントエンド logic.ts と完全同期）
-- ============================================================
CREATE OR REPLACE FUNCTION life_exam_get_world_and_character(
  p_s1 numeric, p_s2 numeric, p_s3 numeric, p_s4 numeric, p_s5 numeric
)
RETURNS TABLE(world_short text, character_name text, character_image text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  financial numeric;
  code4     text;
  cname     text;
  wshort    text;
BEGIN
  -- 金融 = max(資産スコア, 収入スコア)
  financial := GREATEST(p_s1, p_s2);

  -- 4軸を絶対閾値で判定して 4 文字コードを組み立て
  --   金融: B閾値=55  / 時間: B閾値=62 / 人間関係: B閾値=55 / 健康: B閾値=60
  code4 :=
    CASE WHEN financial >= 55 THEN 'M' ELSE 'P' END ||
    CASE WHEN p_s4      >= 62 THEN 'F' ELSE 'B' END ||
    CASE WHEN p_s3      >= 55 THEN 'C' ELSE 'L' END ||
    CASE WHEN p_s5      >= 60 THEN 'H' ELSE 'S' END;

  -- MFCH: 全軸 A 閾値超えならアマテラスオオミカミ、それ以外はイカロス
  --   金融: A閾値=68 / 時間: A閾値=78 / 人間関係: A閾値=72 / 健康: A閾値=78
  IF code4 = 'MFCH' THEN
    IF financial >= 68 AND p_s4 >= 78 AND p_s3 >= 72 AND p_s5 >= 78 THEN
      cname := 'アマテラスオオミカミ';
    ELSE
      cname := 'イカロス';
    END IF;
  ELSE
  cname := CASE code4
    WHEN 'MFLH' THEN '孤独な大王'
    WHEN 'MFCS' THEN 'スフィンクス'
    WHEN 'MFLS' THEN 'カイコ'
    WHEN 'PFCH' THEN 'ツクヨミ'
    WHEN 'PFLH' THEN '没落貴族'
    WHEN 'PFCS' THEN 'ナマケモノ'
    WHEN 'PFLS' THEN 'カタツムリ'
    WHEN 'MBCH' THEN 'ドワーフの王'
    WHEN 'MBLH' THEN '騎士'
    WHEN 'MBCS' THEN 'タヌキ'
    WHEN 'MBLS' THEN 'フンコロガシ'
    WHEN 'PBCH' THEN 'オークの族長'
    WHEN 'PBLH' THEN '流れ者'
    WHEN 'PBCS' THEN 'ハイエナ'
    WHEN 'PBLS' THEN '蚊'
    ELSE '蚊'
  END;
  END IF;

  -- 世界判定（金融×時間の 2 軸で決まる）
  wshort := CASE LEFT(code4, 1) || SUBSTRING(code4, 2, 1)
    WHEN 'MF' THEN '空'
    WHEN 'MB' THEN '地上'
    WHEN 'PF' THEN '海'
    WHEN 'PB' THEN '闇'
    ELSE '闇'
  END;

  RETURN QUERY SELECT
    wshort,
    cname,
    ('/life-diagnosis/characters/' || cname || '.png')::text;
END;
$$;

-- ============================================================
-- 2. 既存の全 ranking_entries を再計算して UPDATE
-- ============================================================
UPDATE life_exam_ranking_entries re
SET
  world           = wc.world_short,
  character_name  = wc.character_name,
  character_image = wc.character_image
FROM life_exam_scores s1
JOIN life_exam_scores s2 ON s2.attempt_id = s1.attempt_id AND s2.subject_id = 2
JOIN life_exam_scores s3 ON s3.attempt_id = s1.attempt_id AND s3.subject_id = 3
JOIN life_exam_scores s4 ON s4.attempt_id = s1.attempt_id AND s4.subject_id = 4
JOIN life_exam_scores s5 ON s5.attempt_id = s1.attempt_id AND s5.subject_id = 5
CROSS JOIN LATERAL life_exam_get_world_and_character(
  s1.score, s2.score, s3.score, s4.score, s5.score
) wc
WHERE s1.subject_id = 1
  AND s1.attempt_id = re.attempt_id
  AND (
    re.world           IS DISTINCT FROM wc.world_short
    OR re.character_name  IS DISTINCT FROM wc.character_name
    OR re.character_image IS DISTINCT FROM wc.character_image
  );
