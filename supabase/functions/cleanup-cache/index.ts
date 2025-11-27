import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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

    console.log('🧹 Starting cache cleanup...');

    // Get expired cache entries (batch of 500)
    const { data: expiredPages, error: fetchError } = await supabase
      .from('chapter_pages')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .limit(500);

    if (fetchError) {
      console.error('❌ Error fetching expired pages:', fetchError);
      throw fetchError;
    }

    if (!expiredPages || expiredPages.length === 0) {
      console.log('✅ No expired cache found');
      return new Response(
        JSON.stringify({ message: 'No expired cache to clean', deleted: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Found ${expiredPages.length} expired pages to delete`);

    // Group by chapter_id for efficient storage deletion
    const chapterGroups = new Map<string, typeof expiredPages>();
    for (const page of expiredPages) {
      if (!chapterGroups.has(page.chapter_id)) {
        chapterGroups.set(page.chapter_id, []);
      }
      chapterGroups.get(page.chapter_id)!.push(page);
    }

    let deletedFiles = 0;
    let deletedRows = 0;

    // Delete from storage chapter by chapter
    for (const [chapterId, pages] of chapterGroups) {
      try {
        // Extract file paths from URLs
        const filePaths = pages
          .map(p => {
            if (!p.cached_image_url) return null;
            try {
              const url = new URL(p.cached_image_url);
              const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/chapter-cache\/(.+)$/);
              return pathMatch ? pathMatch[1] : null;
            } catch {
              return null;
            }
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('chapter-cache')
            .remove(filePaths);

          if (deleteError) {
            console.warn(`⚠️ Error deleting files for chapter ${chapterId}:`, deleteError);
          } else {
            deletedFiles += filePaths.length;
            console.log(`✅ Deleted ${filePaths.length} files for chapter ${chapterId}`);
          }
        }

        // Delete rows from database
        const { error: dbDeleteError } = await supabase
          .from('chapter_pages')
          .delete()
          .in('id', pages.map(p => p.id));

        if (dbDeleteError) {
          console.warn(`⚠️ Error deleting DB rows for chapter ${chapterId}:`, dbDeleteError);
        } else {
          deletedRows += pages.length;
        }
      } catch (error) {
        console.error(`❌ Error processing chapter ${chapterId}:`, error);
      }
    }

    // Log to scrape_logs
    await supabase.from('scrape_logs').insert({
      action: 'CLEANUP_CACHE',
      status: 'SUCCESS',
      target_url: `${deletedFiles} files, ${deletedRows} rows deleted`,
    });

    console.log(`✅ Cleanup complete: ${deletedFiles} files and ${deletedRows} rows deleted`);

    return new Response(
      JSON.stringify({
        message: 'Cache cleanup successful',
        deletedFiles,
        deletedRows,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in cleanup-cache:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from('scrape_logs').insert({
        action: 'CLEANUP_CACHE',
        status: 'FAILED',
        error_message: errorMessage,
      });
    } catch {}

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
