-- Create storage buckets for chapters and covers if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('chapters', 'chapters', true, 20971520, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('chapters-originals', 'chapters-originals', false, 20971520, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('covers', 'covers', true, 15728640, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('covers-originals', 'covers-originals', false, 15728640, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('ads', 'ads', true, 15728640, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4']),
  ('flags', 'flags', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view chapter images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload chapter images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete chapter images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access original chapter images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access original covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view ads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload ads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete ads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view flags" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload flags" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete flags" ON storage.objects;

-- Create RLS policies for chapters bucket (public read, admin write)
CREATE POLICY "Anyone can view chapter images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapters');

CREATE POLICY "Admins can upload chapter images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chapters' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete chapter images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chapters' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for chapters-originals bucket (admin only)
CREATE POLICY "Admins can access original chapter images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'chapters-originals' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for covers bucket (public read, admin write)
CREATE POLICY "Anyone can view covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "Admins can upload covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'covers' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'covers' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for covers-originals bucket (admin only)
CREATE POLICY "Admins can access original covers"
ON storage.objects FOR ALL
USING (
  bucket_id = 'covers-originals' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for ads bucket (public read, admin write)
CREATE POLICY "Anyone can view ads"
ON storage.objects FOR SELECT
USING (bucket_id = 'ads');

CREATE POLICY "Admins can upload ads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ads' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete ads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ads' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for flags bucket (public read, admin write)
CREATE POLICY "Anyone can view flags"
ON storage.objects FOR SELECT
USING (bucket_id = 'flags');

CREATE POLICY "Admins can upload flags"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'flags' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete flags"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'flags' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);