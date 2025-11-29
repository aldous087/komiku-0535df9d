import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scrapeComicDetail } from '../_shared/scraperAdaptersV2.ts';
import { slugify } from '../_shared/httpClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function processComicData(sourceCode: string, url: string) {
  console.log(`Processing comic from ${sourceCode}: ${url}`);
  
  const comicData = await scrapeComicDetail(sourceCode, url);
  
  return {
    comic: {
      title: comicData.title,
      coverUrl: comicData.coverUrl,
      description: comicData.description,
      status: comicData.status,
      type: comicData.type,
      rating: comicData.rating,
      genres: comicData.genres,
      sourceUrl: url,
    },
    chapters: comicData.chapters,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sourceUrl, sourceCode, komikId } = await req.json();

    if (!sourceUrl || !sourceCode) {
      throw new Error('sourceUrl and sourceCode are required');
    }

    console.log(`Syncing comic from ${sourceCode}: ${sourceUrl}`);

    // Get source ID
    const { data: source } = await supabase
      .from('sources')
      .select('id')
      .eq('code', sourceCode)
      .single();

    if (!source) throw new Error('Source not found');

    // Scrape comic data
    const { comic, chapters } = await processComicData(sourceCode, sourceUrl);
    
    const sourceSlug = sourceUrl.split('/').filter(Boolean).pop() || '';

    let finalKomikId = komikId;

    if (komikId) {
      // Update existing
      await supabase
        .from('komik')
        .update({
          title: comic.title,
          description: comic.description,
          cover_url: comic.coverUrl,
          status: comic.status,
          type: comic.type || 'manga',
          rating: comic.rating,
          genres: comic.genres,
          source_id: source.id,
          source_slug: sourceSlug,
          source_url: sourceUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', komikId);
    } else {
      // Create new
      const slug = slugify(comic.title);
      const { data: newKomik } = await supabase
        .from('komik')
        .insert({
          title: comic.title,
          slug: slug,
          description: comic.description,
          cover_url: comic.coverUrl,
          status: comic.status,
          type: comic.type || 'manga',
          rating: comic.rating,
          genres: comic.genres,
          source_id: source.id,
          source_slug: sourceSlug,
          source_url: sourceUrl,
        })
        .select()
        .single();

      finalKomikId = newKomik?.id;
    }

    // Sync chapters
    for (const ch of chapters) {
      await supabase
        .from('chapters')
        .upsert({
          komik_id: finalKomikId,
          chapter_number: ch.chapterNumber,
          title: ch.title,
          source_chapter_id: ch.sourceChapterId,
          source_url: ch.sourceUrl,
        }, {
          onConflict: 'komik_id,chapter_number',
        });
    }

    await supabase.from('scrape_logs').insert({
      source_id: source.id,
      target_url: sourceUrl,
      action: 'SYNC_COMIC',
      status: 'SUCCESS',
    });

    return new Response(
      JSON.stringify({
        success: true,
        komikId: finalKomikId,
        chaptersCount: chapters.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
