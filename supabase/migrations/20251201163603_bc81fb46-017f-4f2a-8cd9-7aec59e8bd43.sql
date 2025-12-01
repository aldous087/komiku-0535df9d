-- Ensure CASCADE delete is properly set up for chapters and related tables

-- Update chapters foreign key to cascade delete
ALTER TABLE public.chapters 
DROP CONSTRAINT IF EXISTS chapters_komik_id_fkey;

ALTER TABLE public.chapters 
ADD CONSTRAINT chapters_komik_id_fkey 
FOREIGN KEY (komik_id) 
REFERENCES public.komik(id) 
ON DELETE CASCADE;

-- Update chapter_images foreign key to cascade delete
ALTER TABLE public.chapter_images 
DROP CONSTRAINT IF EXISTS chapter_images_chapter_id_fkey;

ALTER TABLE public.chapter_images 
ADD CONSTRAINT chapter_images_chapter_id_fkey 
FOREIGN KEY (chapter_id) 
REFERENCES public.chapters(id) 
ON DELETE CASCADE;

-- Update chapter_pages foreign key to cascade delete
ALTER TABLE public.chapter_pages 
DROP CONSTRAINT IF EXISTS chapter_pages_chapter_id_fkey;

ALTER TABLE public.chapter_pages 
ADD CONSTRAINT chapter_pages_chapter_id_fkey 
FOREIGN KEY (chapter_id) 
REFERENCES public.chapters(id) 
ON DELETE CASCADE;

-- Update bookmarks foreign key to cascade delete
ALTER TABLE public.bookmarks 
DROP CONSTRAINT IF EXISTS bookmarks_komik_id_fkey;

ALTER TABLE public.bookmarks 
ADD CONSTRAINT bookmarks_komik_id_fkey 
FOREIGN KEY (komik_id) 
REFERENCES public.komik(id) 
ON DELETE CASCADE;

-- Update comments foreign key to cascade delete
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_komik_id_fkey;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_komik_id_fkey 
FOREIGN KEY (komik_id) 
REFERENCES public.komik(id) 
ON DELETE CASCADE;

ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_chapter_id_fkey;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_chapter_id_fkey 
FOREIGN KEY (chapter_id) 
REFERENCES public.chapters(id) 
ON DELETE CASCADE;

-- Update reading_history foreign keys to cascade delete
ALTER TABLE public.reading_history 
DROP CONSTRAINT IF EXISTS reading_history_komik_id_fkey;

ALTER TABLE public.reading_history 
ADD CONSTRAINT reading_history_komik_id_fkey 
FOREIGN KEY (komik_id) 
REFERENCES public.komik(id) 
ON DELETE CASCADE;

ALTER TABLE public.reading_history 
DROP CONSTRAINT IF EXISTS reading_history_chapter_id_fkey;

ALTER TABLE public.reading_history 
ADD CONSTRAINT reading_history_chapter_id_fkey 
FOREIGN KEY (chapter_id) 
REFERENCES public.chapters(id) 
ON DELETE CASCADE;