-- 人生偏差値のサンプル（シード）データをリセットする。
-- シードに使ったユーザー（auth.users の1件目）に紐づく life_exam_attempts をすべて削除する。
-- life_exam_scores / life_exam_answers は ON DELETE CASCADE で自動削除される。
-- auth.users が空の場合は何もしない。

DO $$
DECLARE
  seed_user_id uuid;
  deleted_count int;
BEGIN
  SELECT id INTO seed_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF seed_user_id IS NULL THEN
    RAISE NOTICE 'auth.users が空のためリセットをスキップしました。';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS tr_life_exam_set_attempt_ranks ON life_exam_attempts;

  WITH deleted AS (
    DELETE FROM life_exam_attempts
    WHERE user_id = seed_user_id
    RETURNING id
  )
  SELECT COUNT(*)::int INTO deleted_count FROM deleted;

  PERFORM life_exam_recompute_all_ranks();

  CREATE TRIGGER tr_life_exam_set_attempt_ranks
    AFTER INSERT ON life_exam_attempts
    FOR EACH ROW
    EXECUTE FUNCTION life_exam_set_attempt_ranks();

  RAISE NOTICE '人生偏差値サンプルデータをリセットしました。削除件数: %', deleted_count;
END;
$$;
