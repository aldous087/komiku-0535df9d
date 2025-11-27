-- Add missing columns to komik table
ALTER TABLE public.komik
ADD COLUMN IF NOT EXISTS type text DEFAULT 'manga',
ADD COLUMN IF NOT EXISTS rating numeric;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_komik_source_id_source_slug ON public.komik(source_id, source_slug);
CREATE INDEX IF NOT EXISTS idx_komik_updated_at ON public.komik(updated_at DESC);

-- Update chapter_pages table for 24-hour cache
ALTER TABLE public.chapter_pages
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Update expires_at for existing records (set to 24 hours from cached_at)
UPDATE public.chapter_pages
SET expires_at = cached_at + interval '24 hours'
WHERE expires_at IS NULL AND cached_at IS NOT NULL;

-- Add indexes for chapter_pages
CREATE INDEX IF NOT EXISTS idx_chapter_pages_chapter_id ON public.chapter_pages(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_pages_expires_at ON public.chapter_pages(expires_at);

-- Add index for chapters
CREATE INDEX IF NOT EXISTS idx_chapters_source_url ON public.chapters(source_url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_komik_chapter_number ON public.chapters(komik_id, chapter_number);

-- Create storage bucket for chapter cache
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chapter-cache',
  'chapter-cache',
  true,
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chapter-cache bucket
CREATE POLICY "Anyone can view cached chapter images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapter-cache');

CREATE POLICY "Service role can upload chapter cache"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chapter-cache');

CREATE POLICY "Service role can update chapter cache"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chapter-cache');

CREATE POLICY "Service role can delete chapter cache"
ON storage.objects FOR DELETE
USING (bucket_id = 'chapter-cache');