import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { safeFetch, extractSlugFromUrl } from '../_shared/httpClient.ts';
import { scrapeChapterPages } from '../_shared/scraperAdapters.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { chapterId } = await req.json();

    if (!chapterId) {
      return new Response(
        JSON.stringify({ error: 'chapterId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Caching chapter:', chapterId);

    // Get chapter data with source info
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select(`
        *,
        komik:komik_id (
          source_id,
          source_slug,
          sources:source_id (
            code,
            base_url
          )
        )
      `)
      .eq('id', chapterId)
      .single();

    if (chapterError || !chapter) {
      console.error('❌ Chapter not found:', chapterError);
      return new Response(
        JSON.stringify({ error: 'Chapter not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check existing cache
    const { data: existingPages } = await supabase
      .from('chapter_pages')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('page_number');

    // If cache exists and not expired, return it
    if (existingPages && existingPages.length > 0) {
      const firstPage = existingPages[0];
      if (firstPage.expires_at && new Date(firstPage.expires_at) > new Date()) {
        console.log('✅ Using existing cache');
        return new Response(
          JSON.stringify({
            chapterId,
            cached: true,
            pages: existingPages.map(p => ({
              pageNumber: p.page_number,
              imageUrl: p.cached_image_url,
            })),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('🔄 Cache expired or not found, scraping...');

    // Delete old cache (database + storage)
    if (existingPages && existingPages.length > 0) {
      // Delete from storage
      const filesToDelete = existingPages
        .map(p => {
          if (!p.cached_image_url) return null;
          const url = new URL(p.cached_image_url);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/chapter-cache\/(.+)$/);
          return pathMatch ? pathMatch[1] : null;
        })
        .filter(Boolean) as string[];

      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('chapter-cache')
          .remove(filesToDelete);
        if (deleteError) {
          console.warn('⚠️ Error deleting old cache files:', deleteError);
        }
      }

      // Delete from database
      await supabase
        .from('chapter_pages')
        .delete()
        .eq('chapter_id', chapterId);
    }

    // Scrape chapter pages
    const sourceCode = chapter.komik.sources.code;
    const chapterUrl = chapter.source_url;

    if (!chapterUrl) {
      return new Response(
        JSON.stringify({ error: 'Chapter source URL not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🌐 Scraping from:', chapterUrl);
    const scrapedPages = await scrapeChapterPages(sourceCode, chapterUrl);

    if (!scrapedPages || scrapedPages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No pages found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Found ${scrapedPages.length} pages, uploading to storage...`);

    // Download and upload each page to storage
    const newPages = [];
    for (const page of scrapedPages) {
      try {
        // Download image
        const imageResponse = await fetch(page.imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': chapterUrl,
          },
        });

        if (!imageResponse.ok) {
          console.warn(`⚠️ Failed to download page ${page.pageNumber}`);
          continue;
        }

        const imageBlob = await imageResponse.blob();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';

        // Upload to storage
        const storagePath = `${chapterId}/${page.pageNumber}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('chapter-cache')
          .upload(storagePath, imageBlob, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`❌ Upload error for page ${page.pageNumber}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chapter-cache')
          .getPublicUrl(storagePath);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        // Insert to database
        const { error: insertError } = await supabase
          .from('chapter_pages')
          .insert({
            chapter_id: chapterId,
            page_number: page.pageNumber,
            source_image_url: page.imageUrl,
            cached_image_url: urlData.publicUrl,
            cached_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        if (insertError) {
          console.error(`❌ DB insert error for page ${page.pageNumber}:`, insertError);
          continue;
        }

        newPages.push({
          pageNumber: page.pageNumber,
          imageUrl: urlData.publicUrl,
        });

        console.log(`✅ Cached page ${page.pageNumber}`);
      } catch (error) {
        console.error(`❌ Error processing page ${page.pageNumber}:`, error);
      }
    }

    console.log(`✅ Successfully cached ${newPages.length} pages`);

    return new Response(
      JSON.stringify({
        chapterId,
        cached: false,
        pages: newPages,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in cache-chapter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
