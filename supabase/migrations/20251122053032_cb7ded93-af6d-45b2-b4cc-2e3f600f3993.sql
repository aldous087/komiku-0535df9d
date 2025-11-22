-- Add unique constraint for source_id and source_slug to prevent duplicate comics
ALTER TABLE komik DROP CONSTRAINT IF EXISTS komik_source_id_source_slug_key;
ALTER TABLE komik ADD CONSTRAINT komik_source_id_source_slug_key UNIQUE (source_id, source_slug);

-- Create index on updated_at for faster homepage queries
CREATE INDEX IF NOT EXISTS idx_komik_updated_at ON komik(updated_at DESC);

-- Create index on source_id for faster source-based queries
CREATE INDEX IF NOT EXISTS idx_komik_source_id ON komik(source_id);