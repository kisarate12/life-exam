-- AI生成分析テキストをレポート購入テーブルに追加
ALTER TABLE life_exam_report_purchases
  ADD COLUMN IF NOT EXISTS ai_analysis text;
