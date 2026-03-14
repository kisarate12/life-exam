-- 既存の life_exam_ranking_entries を、正しい16キャラ判定ロジックで再計算して更新する。
-- （旧シードで「空＝獅子」のみ入っていた等で全員同じキャラになっている問題を解消）

UPDATE life_exam_ranking_entries re
SET
  world = wc.world_short,
  character_name = wc.character_name,
  character_image = wc.character_image,
  updated_at = now()
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
