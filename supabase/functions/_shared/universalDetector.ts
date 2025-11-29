// Universal Comic Scraper - Auto-detect common patterns across websites

import { load } from 'https://esm.sh/cheerio@1.0.0-rc.12';
import { safeFetch, extractChapterNumber, slugify } from './httpClient.ts';

export interface UniversalComicData {
  title: string;
  coverUrl?: string;
  description?: string;
  status?: string;
  type?: string;
  rating?: number;
  genres?: string[];
  author?: string;
  artist?: string;
  chapters: {
    sourceUrl: string;
    sourceChapterId: string;
    chapterNumber: number;
    title?: string;
  }[];
}

export interface CustomSelectors {
  title?: string;
  cover?: string;
  description?: string;
  genres?: string;
  status?: string;
  rating?: string;
  chapterList?: string;
  chapterLink?: string;
  chapterTitle?: string;
}

/**
 * Universal scraper with auto-detection and optional custom selectors
 * V3 - Enhanced with patterns from multiple popular sites
 */
export async function scrapeUniversal(
  url: string,
  customSelectors?: CustomSelectors
): Promise<UniversalComicData> {
  console.log('[SCRAPER V3] ========================================');
  console.log('[SCRAPER V3] Universal scraper starting for:', url);
  console.log('[SCRAPER V3] Custom selectors provided:', !!customSelectors);
  
  const html = await safeFetch(url);
  const $ = load(html);
  
  console.log('[SCRAPER V3] HTML loaded, size:', html.length, 'bytes');
  
  // Auto-detect or use custom selectors
  const titleSelector = customSelectors?.title || autoDetectTitle($);
  const coverSelector = customSelectors?.cover || autoDetectCover($);
  const descSelector = customSelectors?.description || autoDetectDescription($);
  const genreSelector = customSelectors?.genres || autoDetectGenres($);
  const statusSelector = customSelectors?.status || autoDetectStatus($);
  const ratingSelector = customSelectors?.rating || autoDetectRating($);
  const chapterListSelector = customSelectors?.chapterList || autoDetectChapterList($);
  const authorSelector = autoDetectAuthor($);
  const typeSelector = autoDetectType($);
  
  console.log('[SCRAPER V3] Detected selectors:', {
    title: titleSelector,
    cover: coverSelector,
    description: descSelector.substring(0, 50) + '...',
    genres: genreSelector,
    status: statusSelector,
    rating: ratingSelector,
    chapters: chapterListSelector,
    author: authorSelector,
    type: typeSelector,
  });
  
  // Extract data
  const title = $(titleSelector).first().text().trim() || 'Unknown Title';
  console.log('[SCRAPER V3] ✓ Title:', title);
  
  const coverUrl = $(coverSelector).first().attr('src') || 
                   $(coverSelector).first().attr('data-src') ||
                   $(coverSelector).first().attr('data-lazy-src');
  console.log('[SCRAPER V3] ✓ Cover URL:', coverUrl);
  
  const description = $(descSelector).first().text().trim();
  console.log('[SCRAPER V3] ✓ Description length:', description.length);
  
  // Extract author
  let author: string | undefined;
  const authorText = $(authorSelector).text().trim();
  if (authorText && authorText.length > 0 && authorText.length < 100) {
    author = authorText;
    console.log('[SCRAPER V3] ✓ Author:', author);
  }
  
  // Extract artist (often same as author)
  let artist: string | undefined;
  const artistText = $('.artist, .komik_info-content-info-author, [itemprop="author"]').text().trim();
  if (artistText && artistText.length > 0 && artistText.length < 100) {
    artist = artistText;
  }
  
  // Extract genres
  const genres: string[] = [];
  $(genreSelector).each((_, el) => {
    const genre = $(el).text().trim();
    if (genre && genre.length < 50 && !genre.includes('Genre') && !genre.includes(':')) {
      genres.push(genre);
    }
  });
  console.log('[SCRAPER V3] ✓ Genres found:', genres.length, '-', genres.join(', '));
  
  // Extract status
  let status = 'Ongoing';
  const statusText = $(statusSelector).text().toLowerCase();
  if (statusText.includes('complete') || statusText.includes('tamat') || 
      statusText.includes('selesai') || statusText.includes('finished')) {
    status = 'Completed';
  } else if (statusText.includes('hiatus') || statusText.includes('berhenti')) {
    status = 'Hiatus';
  }
  console.log('[SCRAPER V3] ✓ Status:', status);
  
  // Extract rating
  let rating: number | undefined;
  const ratingText = $(ratingSelector).first().text().trim();
  const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
  if (ratingMatch) {
    rating = parseFloat(ratingMatch[1]);
    if (rating > 10) rating = rating / 10; // Normalize to 0-10
    if (rating > 100) rating = rating / 100; // Some sites use 0-100
    console.log('[SCRAPER V3] ✓ Rating:', rating);
  }
  
  // Extract type
  let type = 'manga';
  const pageText = $('body').text().toLowerCase();
  const typeText = $(typeSelector).text().toLowerCase();
  
  if (typeText.includes('manhwa') || pageText.includes('manhwa')) {
    type = 'manhwa';
  } else if (typeText.includes('manhua') || pageText.includes('manhua')) {
    type = 'manhua';
  } else if (typeText.includes('novel') || pageText.includes('novel')) {
    type = 'novel';
  } else if (typeText.includes('webtoon') || pageText.includes('webtoon')) {
    type = 'manhwa'; // Webtoon is typically Korean
  }
  console.log('[SCRAPER V3] ✓ Type:', type);
  
  // Extract chapters
  const chapters: UniversalComicData['chapters'] = [];
  const chapterElements = $(chapterListSelector);
  console.log('[SCRAPER V3] Found chapter elements:', chapterElements.length);
  
  chapterElements.each((_, el) => {
    const $el = $(el);
    let chapterUrl = $el.attr('href') || $el.find('a').attr('href');
    const chapterText = customSelectors?.chapterTitle 
      ? $el.find(customSelectors.chapterTitle).text()
      : $el.text();
    
    if (chapterUrl) {
      // Make absolute URL
      if (chapterUrl.startsWith('/')) {
        const baseUrl = new URL(url);
        chapterUrl = `${baseUrl.protocol}//${baseUrl.host}${chapterUrl}`;
      } else if (!chapterUrl.startsWith('http')) {
        const baseUrl = new URL(url);
        chapterUrl = `${baseUrl.protocol}//${baseUrl.host}/${chapterUrl}`;
      }
      
      const chapterNumber = extractChapterNumber(chapterText);
      
      chapters.push({
        sourceUrl: chapterUrl,
        sourceChapterId: slugify(chapterUrl.split('/').filter(Boolean).pop() || ''),
        chapterNumber,
        title: chapterText.trim(),
      });
    }
  });
  
  console.log('[SCRAPER V3] ✓ Chapters extracted:', chapters.length);
  if (chapters.length > 0) {
    console.log('[SCRAPER V3] ✓ First chapter:', chapters[0].chapterNumber, '-', chapters[0].title);
    console.log('[SCRAPER V3] ✓ Last chapter:', chapters[chapters.length - 1].chapterNumber, '-', chapters[chapters.length - 1].title);
  }
  
  console.log('[SCRAPER V3] ========================================');
  
  return {
    title,
    coverUrl,
    description,
    status,
    type,
    rating,
    genres,
    author,
    artist,
    chapters,
  };
}

/**
 * Auto-detect title selector
 * V3 - Enhanced with more patterns
 */
function autoDetectTitle($: any): string {
  const selectors = [
    // Komikcast, Shinigami, Manhwalist
    'h1.entry-title',
    '.komik_info-content-body h1',
    '.series-title h1',
    
    // MangaDex, MangaFire
    '.manga-title h1',
    '.title-wrapper h1',
    
    // Asura, FlameScans
    '.post-title h1',
    '.series-name h1',
    
    // KomikIndo
    '.seriestuheader h1',
    '.series-title',
    
    // Generic patterns
    'h1[itemprop="name"]',
    'h1.title',
    '.comic-title h1',
    'h1',
  ];
  
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 3 && text.length < 200) {
      console.log('[SCRAPER V3] Title selector matched:', sel);
      return sel;
    }
  }
  
  console.log('[SCRAPER V3] Title: using fallback h1');
  return 'h1';
}

/**
 * Auto-detect cover image selector
 * V3 - Enhanced with lazy loading support
 */
function autoDetectCover($: any): string {
  const selectors = [
    // Komikcast, Shinigami, Manhwalist
    '.thumb img',
    '.komik_info-content-thumbnail img',
    '.series-thumb img',
    
    // MangaDex, MangaFire
    '.manga-image img',
    '.cover img',
    
    // Asura, FlameScans  
    '.summary_image img',
    '.post-thumb img',
    
    // KomikIndo
    '.seriestucon img',
    '.seriestucontent img',
    
    // Generic patterns with lazy loading
    'img[itemprop="image"]',
    'img.wp-post-image',
    '.featured-image img',
    'img[data-src]',
    'img[data-lazy-src]',
  ];
  
  for (const sel of selectors) {
    const src = $(sel).first().attr('src') || 
                $(sel).first().attr('data-src') ||
                $(sel).first().attr('data-lazy-src');
    if (src && src.length > 10 && !src.includes('placeholder')) {
      console.log('[SCRAPER V3] Cover selector matched:', sel);
      return sel;
    }
  }
  
  console.log('[SCRAPER V3] Cover: using fallback img');
  return 'img';
}

/**
 * Auto-detect description selector
 * V3 - Enhanced with more patterns
 */
function autoDetectDescription($: any): string {
  const selectors = [
    // Komikcast, Shinigami, Manhwalist
    '.entry-content[itemprop="description"]',
    '.komik_info-description-sinopsis',
    '.series-synops',
    
    // MangaDex, MangaFire
    '.description',
    '.manga-excerpt',
    
    // Asura, FlameScans
    '.summary__content',
    '.manga-summary',
    
    // KomikIndo
    '.seriestucon .entry-content',
    '.seriestuheader .entry-content',
    
    // Generic patterns
    '[itemprop="description"]',
    '.synopsis',
    '.summary',
    '.description p',
    'p',
  ];
  
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 50) {
      console.log('[SCRAPER V3] Description selector matched:', sel, '- length:', text.length);
      return sel;
    }
  }
  
  console.log('[SCRAPER V3] Description: using fallback p');
  return 'p';
}

/**
 * Auto-detect genre selector
 * V3 - Enhanced with more patterns
 */
function autoDetectGenres($: any): string {
  const selectors = [
    // Komikcast, Shinigami, Manhwalist
    '.mgen a',
    '.komik_info-content-genre a',
    '.series-genres a',
    
    // MangaDex, MangaFire
    '.genres a',
    '.manga-genres a',
    
    // Asura, FlameScans
    '.genres-content a',
    '.wp-manga-tags a',
    
    // KomikIndo
    '.seriestugenre a',
    '.genxed a',
    
    // Generic patterns
    '.genre-info a',
    '[rel="tag"]',
    '.tags a',
    '.genre a',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      console.log('[SCRAPER V3] Genre selector matched:', sel, '- count:', $(sel).length);
      return sel;
    }
  }
  
  console.log('[SCRAPER V3] Genre: using fallback .genre a');
  return '.genre a';
}

/**
 * Auto-detect status selector
 * V3 - Enhanced with more patterns
 */
function autoDetectStatus($: any): string {
  const selectors = [
    // Common patterns
    '.series-status',
    '.status',
    '.komik_info-content-info-status',
    
    // MangaDex, MangaFire
    '.post-status',
    '.manga-status',
    
    // Asura, FlameScans
    '.summary-heading:contains("Status") + .summary-content',
    '.post-content_item:contains("Status")',
    
    // KomikIndo
    '.seriestuheader .status',
    '.infotable tr:contains("Status") td',
    
    // Generic patterns
    '.imptdt:contains("Status")',
    '.spe:contains("Status")',
    'body',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      console.log('[SCRAPER V3] Status selector matched:', sel);
      return sel;
    }
  }
  
  return 'body';
}

/**
 * Auto-detect rating selector
 * V3 - Enhanced with more patterns
 */
function autoDetectRating($: any): string {
  const selectors = [
    // Common patterns
    '.rating-prc',
    '.rating',
    '.komik_info-content-rating',
    
    // MangaDex, MangaFire
    '.post-total-rating',
    '.manga-rating',
    
    // Asura, FlameScans
    '.post-rating .num',
    '.summary-heading:contains("Rating") + .summary-content',
    
    // KomikIndo
    '.seriestuheader .rating',
    '.data-rating',
    
    // Generic patterns
    '[itemprop="ratingValue"]',
    '.score',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      console.log('[SCRAPER V3] Rating selector matched:', sel);
      return sel;
    }
  }
  
  return '.rating';
}

/**
 * Auto-detect author selector
 * V3 - New function
 */
function autoDetectAuthor($: any): string {
  const selectors = [
    '.author',
    '.komik_info-content-info-author',
    '[itemprop="author"]',
    '.summary-heading:contains("Author") + .summary-content',
    '.infotable tr:contains("Author") td',
    '.artist',
  ];
  
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 0 && text.length < 100) {
      console.log('[SCRAPER V3] Author selector matched:', sel);
      return sel;
    }
  }
  
  return '.author';
}

/**
 * Auto-detect type selector
 * V3 - New function
 */
function autoDetectType($: any): string {
  const selectors = [
    '.type',
    '.komik_info-content-info-type',
    '.summary-heading:contains("Type") + .summary-content',
    '.infotable tr:contains("Type") td',
    'body',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      console.log('[SCRAPER V3] Type selector matched:', sel);
      return sel;
    }
  }
  
  return 'body';
}

/**
 * Auto-detect chapter list selector
 * V3 - Enhanced with more patterns and pagination support
 */
function autoDetectChapterList($: any): string {
  const selectors = [
    // Komikcast, Shinigami, Manhwalist
    '#chapterlist li a',
    '.eplister li a',
    '.komik_info-chapters-item a',
    
    // MangaDex, MangaFire
    '.chapter-list a',
    '.chapters-list-ul li a',
    
    // Asura, FlameScans
    '.version-chap li a',
    '.wp-manga-chapter a',
    
    // KomikIndo
    '.eph-num a',
    '.chapter-link',
    
    // Generic patterns
    '.lchx a',
    '.chapter-item a',
    'li.chapter a',
    'a:contains("Chapter")',
    'a:contains("Ch.")',
  ];
  
  for (const sel of selectors) {
    const count = $(sel).length;
    if (count > 0) {
      console.log('[SCRAPER V3] Chapter list selector matched:', sel, '- count:', count);
      return sel;
    }
  }
  
  console.log('[SCRAPER V3] Chapter list: using fallback a:contains("Chapter")');
  return 'a:contains("Chapter")';
}

/**
 * Scrape chapter images using universal detection
 * V3 - Enhanced with lazy loading and better detection
 */
export async function scrapeChapterImages(url: string, customSelector?: string): Promise<string[]> {
  console.log('[SCRAPER V3] ========================================');
  console.log('[SCRAPER V3] Scraping chapter images from:', url);
  
  const html = await safeFetch(url, { referer: url });
  const $ = load(html);
  
  const selector = customSelector || autoDetectImageSelector($);
  console.log('[SCRAPER V3] Using image selector:', selector);
  
  const images: string[] = [];
  
  $(selector).each((_, el) => {
    const src = $(el).attr('src') || 
                $(el).attr('data-src') || 
                $(el).attr('data-lazy-src') ||
                $(el).attr('data-original');
                
    if (src && 
        !src.includes('loader') && 
        !src.includes('placeholder') &&
        !src.includes('loading') &&
        !src.includes('spinner') &&
        src.length > 10) {
      images.push(src);
    }
  });
  
  console.log('[SCRAPER V3] ✓ Found ${images.length} valid images');
  
  if (images.length === 0) {
    console.log('[SCRAPER V3] ✗ No images found! May need Playwright fallback');
  } else {
    console.log('[SCRAPER V3] ✓ First image:', images[0].substring(0, 80) + '...');
    console.log('[SCRAPER V3] ✓ Last image:', images[images.length - 1].substring(0, 80) + '...');
  }
  
  console.log('[SCRAPER V3] ========================================');
  return images;
}

/**
 * Auto-detect chapter image selector
 * V3 - Enhanced with more patterns
 */
function autoDetectImageSelector($: any): string {
  const selectors = [
    // Komikcast, Shinigami, Manhwalist
    '#readerarea img',
    '.reader-area img',
    '.main-reading-area img',
    
    // MangaDex, MangaFire
    '.reading-content img',
    '.chapter-content img',
    
    // Asura, FlameScans
    '.reading-detail img',
    '.page-break img',
    
    // KomikIndo
    '#chapter img',
    '.chapter-images img',
    
    // Generic patterns with lazy loading
    'img[data-src]',
    'img[data-lazy-src]',
    'img[data-original]',
    '.entry-content img',
    'img',
  ];
  
  for (const sel of selectors) {
    const count = $(sel).length;
    if (count > 0) {
      console.log('[SCRAPER V3] Image selector matched:', sel, '- count:', count);
      return sel;
    }
  }
  
  console.log('[SCRAPER V3] Image: using fallback img');
  return 'img';
}
