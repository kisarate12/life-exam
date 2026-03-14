-- drafts: 短文返信 or Doc + URL の区別と Doc 本文
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS draft_type TEXT NOT NULL DEFAULT 'short'
    CHECK (draft_type IN ('short', 'doc')),
  ADD COLUMN IF NOT EXISTS doc_content TEXT;

COMMENT ON COLUMN drafts.draft_type IS 'short: 通常の短文返信, doc: Google Doc に本文を書き URL を共有';
COMMENT ON COLUMN drafts.doc_content IS 'draft_type=doc のときの Doc に書き込む本文。送信するのは短文＋URL。';
