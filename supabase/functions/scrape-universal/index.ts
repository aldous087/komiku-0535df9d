// Universal Scraper Edge Function - Scrape any comic website

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scrapeComicDetail, scrapeChapterPages } from '../_shared/scraperAdaptersV2.ts';
import { slugify } from '../_shared/httpClient.ts';

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { url, sourceCode, customSelectors, komikId } = await req.json();

    if (!url) {
      throw new Error('URL is required');
    }

    console.log(`Universal scraper starting for: ${url}`);
    console.log('Source code:', sourceCode || 'AUTO-DETECT');
    console.log('Custom selectors:', customSelectors ? 'YES' : 'NO');

    // Detect source code if not provided
    let detectedSourceCode = sourceCode || 'UNIVERSAL';
    
    if (!sourceCode) {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('manhwalist')) {
        detectedSourceCode = 'MANHWALIST';
      } else if (hostname.includes('shinigami')) {
        detectedSourceCode = 'SHINIGAMI';
      } else if (hostname.includes('komikcast')) {
        detectedSourceCode = 'KOMIKCAST';
      }
    }
    
    console.log('Using source code:', detectedSourceCode);

    // Get or create source
    let source;
    const { data: existingSource } = await supabase
      .from('sources')
      .select('id')
      .eq('code', detectedSourceCode)
      .single();

    if (existingSource) {
      source = existingSource;
    } else {
      // Create new source for universal scraping
      const hostname = new URL(url).hostname;
      const { data: newSource } = await supabase
        .from('sources')
        .insert({
          name: hostname,
          code: detectedSourceCode,
          base_url: `${new URL(url).protocol}//${hostname}`,
          is_active: true,
        })
        .select()
        .single();
      
      source = newSource;
    }

    if (!source) throw new Error('Failed to get or create source');

    // Scrape comic data
    const comicData = await scrapeComicDetail(detectedSourceCode, url, customSelectors);
    
    console.log(`Scraped: ${comicData.title}`);
    console.log(`Found: ${comicData.chapters.length} chapters`);
    console.log(`Genres: ${comicData.genres?.join(', ') || 'none'}`);
    console.log(`Rating: ${comicData.rating || 'none'}`);
    console.log(`Type: ${comicData.type || 'manga'}`);

    const sourceSlug = url.split('/').filter(Boolean).pop() || '';
    let finalKomikId = komikId;

    // Save or update comic
    if (komikId) {
      console.log('Updating existing comic:', komikId);
      await supabase
        .from('komik')
        .update({
          title: comicData.title,
          description: comicData.description,
          cover_url: comicData.coverUrl,
          status: comicData.status || 'Ongoing',
          type: comicData.type || 'manga',
          rating: comicData.rating,
          genres: comicData.genres,
          source_id: source.id,
          source_slug: sourceSlug,
          source_url: url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', komikId);
    } else {
      console.log('Creating new comic');
      const slug = slugify(comicData.title);
      const { data: newKomik } = await supabase
        .from('komik')
        .insert({
          title: comicData.title,
          slug: slug,
          description: comicData.description,
          cover_url: comicData.coverUrl,
          status: comicData.status || 'Ongoing',
          type: comicData.type || 'manga',
          rating: comicData.rating,
          genres: comicData.genres,
          source_id: source.id,
          source_slug: sourceSlug,
          source_url: url,
        })
        .select()
        .single();

      finalKomikId = newKomik?.id;
    }

    // Sync chapters
    console.log(`Syncing ${comicData.chapters.length} chapters...`);
    let syncedCount = 0;
    
    for (const ch of comicData.chapters) {
      try {
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
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync chapter ${ch.chapterNumber}:`, error);
      }
    }

    console.log(`Successfully synced ${syncedCount}/${comicData.chapters.length} chapters`);

    // Log scraping action
    await supabase.from('scrape_logs').insert({
      source_id: source.id,
      target_url: url,
      action: 'UNIVERSAL_SCRAPE',
      status: 'SUCCESS',
    });

    return new Response(
      JSON.stringify({
        success: true,
        komikId: finalKomikId,
        comic: {
          title: comicData.title,
          coverUrl: comicData.coverUrl,
          genres: comicData.genres,
          rating: comicData.rating,
          type: comicData.type,
          status: comicData.status,
        },
        chaptersCount: comicData.chapters.length,
        chaptersSynced: syncedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Universal scraper error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
