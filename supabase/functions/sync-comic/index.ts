import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const lastRequestTime: Record<string, number> = {};
const MIN_DELAY_MS = 2000;

async function safeFetch(url: string): Promise<string> {
  const hostname = new URL(url).hostname;
  const now = Date.now();
  const lastTime = lastRequestTime[hostname] || 0;
  const timeSinceLastRequest = now - lastTime;
  
  if (timeSinceLastRequest < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - timeSinceLastRequest));
  }
  
  lastRequestTime[hostname] = Date.now();
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

function extractChapterNumber(text: string): number {
  const match = text.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

async function scrapeComicDetail(sourceCode: string, url: string) {
  const html = await safeFetch(url);
  const $ = cheerio.load(html);
  
  let comic: any = { sourceUrl: url };
  let chapters: any[] = [];

  if (sourceCode === 'MANHWALIST') {
    comic.title = $('.entry-title, h1.title').first().text().trim();
    comic.coverUrl = $('.thumb img, .series-thumb img').first().attr('src');
    comic.description = $('.entry-content p, .series-synops').first().text().trim();
    comic.status = $('.series-status').text().includes('Ongoing') ? 'Ongoing' : 'Completed';
    comic.type = 'manga'; // Default, could be parsed from page
    comic.genres = $('.series-genres a').map((_, el) => $(el).text().trim()).get();
    
    // Try to parse rating
    const ratingText = $('.rating-prc, .rating').first().text().trim();
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    comic.rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    $('.chapter-list li a, .eplister li a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const title = $el.text().trim();
      if (href) {
        chapters.push({
          sourceUrl: href,
          sourceChapterId: href.split('/').filter(Boolean).pop() || '',
          chapterNumber: extractChapterNumber(title),
          title: title,
        });
      }
    });
  } else if (sourceCode === 'SHINIGAMI') {
    comic.title = $('.entry-title, h1').first().text().trim();
    comic.coverUrl = $('.thumb img, .series-thumb img').first().attr('src');
    comic.description = $('.entry-content, .series-synops').first().text().trim();
    comic.status = $('.status').text().includes('Ongoing') ? 'Ongoing' : 'Completed';
    comic.type = 'manga'; // Default
    comic.genres = $('.genxed a').map((_, el) => $(el).text().trim()).get();
    
    const ratingText = $('.rating-prc, .rating').first().text().trim();
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    comic.rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    $('.eplister li a, #chapterlist li a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const title = $el.find('.chapternum').text() || $el.text();
      if (href) {
        chapters.push({
          sourceUrl: href,
          sourceChapterId: href.split('/').filter(Boolean).pop() || '',
          chapterNumber: extractChapterNumber(title),
          title: title.trim(),
        });
      }
    });
  } else if (sourceCode === 'KOMIKCAST') {
    comic.title = $('.komik_info-content-body-title, h1').first().text().trim();
    comic.coverUrl = $('.komik_info-content-thumbnail img').first().attr('src');
    comic.description = $('.komik_info-description-sinopsis').first().text().trim();
    comic.status = $('.komik_info-content-info-status').text().includes('Ongoing') ? 'Ongoing' : 'Completed';
    comic.type = 'manga'; // Default
    comic.genres = $('.komik_info-content-genre a').map((_, el) => $(el).text().trim()).get();
    
    const ratingText = $('.data-rating, .rating').first().text().trim();
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    comic.rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

    $('.komik_info-chapters-item a').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const title = $el.text().trim();
      if (href) {
        chapters.push({
          sourceUrl: href,
          sourceChapterId: href.split('/').filter(Boolean).pop() || '',
          chapterNumber: extractChapterNumber(title),
          title: title,
        });
      }
    });
  }

  return { comic, chapters };
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
    const { comic, chapters } = await scrapeComicDetail(sourceCode, sourceUrl);
    
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
      const slug = comic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
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
