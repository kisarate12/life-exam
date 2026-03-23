-- キャラクター「頭痛の亀」→「ナマケモノ」へのリネーム
-- 対象: life_exam_get_world_and_character 関数 + 既存 ranking_entries データ

-- =========================================================
-- 1. 判定関数のキャラ名を更新（PFCS → ナマケモノ）
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
    CASE WHEN financial >= 54 THEN 'M' ELSE 'P' END ||
    CASE WHEN p_s4      >= 53 THEN 'F' ELSE 'B' END ||
    CASE WHEN p_s3      >= 54 THEN 'C' ELSE 'L' END ||
    CASE WHEN p_s5      >= 65 THEN 'H' ELSE 'S' END;

  -- コード → キャラ名
  cname := CASE code4
    WHEN 'MFCH' THEN 'アマテラスオオミカミ'
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
-- 2. 既存の ranking_entries を更新（頭痛の亀 → ナマケモノ）
-- =========================================================
UPDATE life_exam_ranking_entries
SET
  character_name  = 'ナマケモノ',
  character_image = '/life-diagnosis/characters/ナマケモノ.png',
  updated_at      = now()
WHERE character_name = '頭痛の亀';
