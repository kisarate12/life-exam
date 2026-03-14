# Supabase（人生の全国共通テスト）

## マイグレーションの実行

1. **Supabase Dashboard** でプロジェクトを開く
2. **SQL Editor** を開く
3. `migrations/00001_life_exam_schema.sql` の内容をコピーして実行

または Supabase CLI を使う場合:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

## スキーマ概要（Life Exam）

| テーブル | 用途 |
|----------|------|
| `life_exam_subjects` | 5科目マスタ |
| `life_exam_questions` | 25問マスタ（拡張用） |
| `life_exam_profiles` | ユーザー基本情報・年齢バンド |
| `life_exam_attempts` | 受験1回分（総合・偏差値・合否・順位） |
| `life_exam_answers` | 回答（1受験=25行） |
| `life_exam_scores` | 科目別スコア（1受験=5行） |
| `life_exam_population_stats` | 将来の偏差値計算用母集団統計 |

RLS により、認証ユーザーは自分のプロフィール・受験・回答・スコアのみ操作可能。
