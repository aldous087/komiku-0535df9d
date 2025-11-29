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
 */
export async function scrapeUniversal(
  url: string,
  customSelectors?: CustomSelectors
): Promise<UniversalComicData> {
  console.log('Universal scraper starting for:', url);
  
  const html = await safeFetch(url);
  const $ = load(html);
  
  // Auto-detect or use custom selectors
  const titleSelector = customSelectors?.title || autoDetectTitle($);
  const coverSelector = customSelectors?.cover || autoDetectCover($);
  const descSelector = customSelectors?.description || autoDetectDescription($);
  const genreSelector = customSelectors?.genres || autoDetectGenres($);
  const statusSelector = customSelectors?.status || autoDetectStatus($);
  const ratingSelector = customSelectors?.rating || autoDetectRating($);
  const chapterListSelector = customSelectors?.chapterList || autoDetectChapterList($);
  
  console.log('Detected selectors:', {
    title: titleSelector,
    cover: coverSelector,
    description: descSelector,
    genres: genreSelector,
    chapters: chapterListSelector,
  });
  
  // Extract data
  const title = $(titleSelector).first().text().trim() || 'Unknown Title';
  const coverUrl = $(coverSelector).first().attr('src') || $(coverSelector).first().attr('data-src');
  const description = $(descSelector).first().text().trim();
  
  // Extract genres
  const genres: string[] = [];
  $(genreSelector).each((_, el) => {
    const genre = $(el).text().trim();
    if (genre && genre.length < 50) genres.push(genre);
  });
  
  // Extract status
  let status = 'Ongoing';
  const statusText = $(statusSelector).text().toLowerCase();
  if (statusText.includes('complete') || statusText.includes('tamat')) {
    status = 'Completed';
  }
  
  // Extract rating
  let rating: number | undefined;
  const ratingText = $(ratingSelector).first().text().trim();
  const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
  if (ratingMatch) {
    rating = parseFloat(ratingMatch[1]);
    if (rating > 10) rating = rating / 10; // Normalize to 0-10
  }
  
  // Extract type
  let type = 'manga';
  const pageText = $('body').text().toLowerCase();
  if (pageText.includes('manhwa')) type = 'manhwa';
  else if (pageText.includes('manhua')) type = 'manhua';
  else if (pageText.includes('novel')) type = 'novel';
  
  // Extract chapters
  const chapters: UniversalComicData['chapters'] = [];
  $(chapterListSelector).each((_, el) => {
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
      }
      
      chapters.push({
        sourceUrl: chapterUrl,
        sourceChapterId: slugify(chapterUrl.split('/').filter(Boolean).pop() || ''),
        chapterNumber: extractChapterNumber(chapterText),
        title: chapterText.trim(),
      });
    }
  });
  
  console.log(`Universal scraper found: ${title}, ${chapters.length} chapters`);
  
  return {
    title,
    coverUrl,
    description,
    status,
    type,
    rating,
    genres,
    chapters,
  };
}

/**
 * Auto-detect title selector
 */
function autoDetectTitle($: any): string {
  const selectors = [
    'h1.entry-title',
    'h1.title',
    '.komik_info-content-body h1',
    '.series-title',
    'h1[itemprop="name"]',
    'h1',
  ];
  
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 3 && text.length < 200) {
      return sel;
    }
  }
  
  return 'h1';
}

/**
 * Auto-detect cover image selector
 */
function autoDetectCover($: any): string {
  const selectors = [
    '.thumb img',
    '.series-thumb img',
    '.komik_info-content-thumbnail img',
    'img[itemprop="image"]',
    '.cover img',
    '.featured-image img',
  ];
  
  for (const sel of selectors) {
    const src = $(sel).first().attr('src') || $(sel).first().attr('data-src');
    if (src && src.length > 10) {
      return sel;
    }
  }
  
  return 'img';
}

/**
 * Auto-detect description selector
 */
function autoDetectDescription($: any): string {
  const selectors = [
    '.entry-content[itemprop="description"]',
    '.series-synops',
    '.komik_info-description-sinopsis',
    '[itemprop="description"]',
    '.description',
    '.synopsis',
  ];
  
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 50) {
      return sel;
    }
  }
  
  return 'p';
}

/**
 * Auto-detect genre selector
 */
function autoDetectGenres($: any): string {
  const selectors = [
    '.mgen a',
    '.series-genres a',
    '.genre-info a',
    '.komik_info-content-genre a',
    '.genxed a',
    '[rel="tag"]',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      return sel;
    }
  }
  
  return '.genre a';
}

/**
 * Auto-detect status selector
 */
function autoDetectStatus($: any): string {
  const selectors = [
    '.series-status',
    '.status',
    '.imptdt:contains("Status")',
    '.spe:contains("Status")',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      return sel;
    }
  }
  
  return 'body';
}

/**
 * Auto-detect rating selector
 */
function autoDetectRating($: any): string {
  const selectors = [
    '.rating-prc',
    '.rating',
    '.data-rating',
    '[itemprop="ratingValue"]',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      return sel;
    }
  }
  
  return '.rating';
}

/**
 * Auto-detect chapter list selector
 */
function autoDetectChapterList($: any): string {
  const selectors = [
    '#chapterlist li a',
    '.eplister li a',
    '.chapter-list li a',
    '.komik_info-chapters-item a',
    '.chapter-link',
    '.lchx a',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      return sel;
    }
  }
  
  return 'a:contains("Chapter")';
}

/**
 * Scrape chapter images using universal detection
 */
export async function scrapeChapterImages(url: string, customSelector?: string): Promise<string[]> {
  console.log('Scraping chapter images from:', url);
  
  const html = await safeFetch(url, { referer: url });
  const $ = load(html);
  
  const selector = customSelector || autoDetectImageSelector($);
  console.log('Using image selector:', selector);
  
  const images: string[] = [];
  
  $(selector).each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (src && !src.includes('loader') && !src.includes('placeholder')) {
      images.push(src);
    }
  });
  
  console.log(`Found ${images.length} images`);
  return images;
}

/**
 * Auto-detect chapter image selector
 */
function autoDetectImageSelector($: any): string {
  const selectors = [
    '#readerarea img',
    '.reader-area img',
    '.main-reading-area img',
    '.reading-content img',
    '.chapter-content img',
    '#chapter-images img',
  ];
  
  for (const sel of selectors) {
    if ($(sel).length > 0) {
      return sel;
    }
  }
  
  return 'img';
}
