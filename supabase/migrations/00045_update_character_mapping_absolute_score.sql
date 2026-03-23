-- キャラクター判定ロジックを刷新:
--   旧: 偏差値→ランク(S~F)→ツリー判定
--   新: 生スコア(0-100)の絶対閾値で4軸(M/P, F/B, C/L, H/S)を判定 → 16キャラに直マッピング
--
-- あわせてキャラ名を新体系に更新:
--   大将軍 → 孤独な大王
--   獅子   → スフィンクス（または孤独な大王に統合）
--   農奴   → 流れ者
--   下流貴族→ 没落貴族
--   ゴブリンキング → オークの族長（既に変更済み）
--
-- 閾値（全国の典型スコアをベース）:
--   金融 = max(sub1_資産, sub2_収入) >= 50 → M / < 50 → P
--   時間 = sub4 >= 50 → F / < 50 → B
--   人間関係 = sub3 >= 50 → C / < 50 → L
--   健康 = sub5 >= 65 → H / < 65 → S  ← 「概ね健康」が多数派なため高め

-- =========================================================
-- 1. 判定関数を新ロジックで上書き
-- =========================================================
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
  -- 金融 = max(資産, 収入)
  financial := GREATEST(p_s1, p_s2);

  -- 4軸を絶対閾値で判定して4文字コードを組み立て
  code4 :=
    CASE WHEN financial >= 50 THEN 'M' ELSE 'P' END ||
    CASE WHEN p_s4      >= 50 THEN 'F' ELSE 'B' END ||
    CASE WHEN p_s3      >= 50 THEN 'C' ELSE 'L' END ||
    CASE WHEN p_s5      >= 65 THEN 'H' ELSE 'S' END;

  -- コード → キャラ名
  cname := CASE code4
    WHEN 'MFCH' THEN 'アマテラスオオミカミ'
    WHEN 'MFLH' THEN '孤独な大王'
    WHEN 'MFCS' THEN 'スフィンクス'
    WHEN 'MFLS' THEN 'カイコ'
    WHEN 'PFCH' THEN 'ツクヨミ'
    WHEN 'PFLH' THEN '没落貴族'
    WHEN 'PFCS' THEN '頭痛の亀'
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

  -- コード → 世界
  wshort := CASE LEFT(code4, 1) || SUBSTRING(code4, 2, 1)
    WHEN 'MF' THEN '空'
    WHEN 'MB' THEN '地上'
    WHEN 'PF' THEN '海'
    WHEN 'PB' THEN '冥界'
    ELSE '冥界'
  END;

  RETURN QUERY SELECT
    wshort,
    cname,
    ('/life-diagnosis/characters/' || cname || '.png')::text;
END;
$$;

-- =========================================================
-- 2. 既存の ranking_entries を全件再計算して更新
-- =========================================================
UPDATE life_exam_ranking_entries re
SET
  world          = wc.world_short,
  character_name = wc.character_name,
  character_image = wc.character_image,
  updated_at     = now()
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
WHERE re.attempt_id = a.id
  AND a.exam_version = '2';
