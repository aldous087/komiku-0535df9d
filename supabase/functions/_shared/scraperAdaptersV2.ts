// Enhanced Scraper Adapters V2 - Fixed and Improved

import { load } from 'https://esm.sh/cheerio@1.0.0-rc.12';
import { safeFetch, extractChapterNumber } from './httpClient.ts';
import { scrapeUniversal, scrapeChapterImages, CustomSelectors } from './universalDetector.ts';

export interface RemoteComicDetail {
  title: string;
  coverUrl?: string;
  description?: string;
  status?: string;
  type?: string;
  rating?: number;
  genres?: string[];
  author?: string;
  artist?: string;
  chapters: RemoteChapterSummary[];
}

export interface RemoteChapterSummary {
  sourceUrl: string;
  sourceChapterId: string;
  chapterNumber: number;
  title?: string;
}

export interface RemoteChapterPage {
  pageNumber: number;
  imageUrl: string;
}

/**
 * Main scraper dispatcher with fallback to universal
 */
export async function scrapeComicDetail(
  sourceCode: string,
  url: string,
  customSelectors?: CustomSelectors
): Promise<RemoteComicDetail> {
  console.log(`Scraping ${sourceCode} from ${url}`);
  
  try {
    switch (sourceCode) {
      case 'MANHWALIST':
        return await scrapeManhwalist(url);
      case 'SHINIGAMI':
        return await scrapeShinigami(url);
      case 'KOMIKCAST':
        return await scrapeKomikcast(url);
      case 'UNIVERSAL':
        return await scrapeUniversal(url, customSelectors);
      default:
        console.log(`Unknown source ${sourceCode}, falling back to universal scraper`);
        return await scrapeUniversal(url, customSelectors);
    }
  } catch (error) {
    console.error(`Scraper failed for ${sourceCode}, trying universal fallback:`, error);
    return await scrapeUniversal(url, customSelectors);
  }
}

/**
 * Scrape chapter pages with fallback to universal
 */
export async function scrapeChapterPages(
  sourceCode: string,
  url: string,
  customSelector?: string
): Promise<RemoteChapterPage[]> {
  console.log(`Scraping chapter pages from ${sourceCode}: ${url}`);
  
  try {
    const html = await safeFetch(url, { referer: url });
    const $ = load(html);

    let images: string[] = [];

    switch (sourceCode) {
      case 'MANHWALIST':
        images = scrapeManhwalistPages($);
        break;
      case 'SHINIGAMI':
        images = scrapeShinigamiPages($);
        break;
      case 'KOMIKCAST':
        images = scrapeKomikcastPages($);
        break;
      default:
        images = await scrapeChapterImages(url, customSelector);
    }
    
    if (images.length === 0) {
      console.log('No images found, trying universal detector');
      images = await scrapeChapterImages(url, customSelector);
    }

    return images.map((imageUrl, index) => ({
      pageNumber: index + 1,
      imageUrl,
    }));
  } catch (error) {
    console.error('Error scraping chapter pages:', error);
    const images = await scrapeChapterImages(url, customSelector);
    return images.map((imageUrl, index) => ({
      pageNumber: index + 1,
      imageUrl,
    }));
  }
}

// ===== MANHWALIST =====
async function scrapeManhwalist(url: string): Promise<RemoteComicDetail> {
  const html = await safeFetch(url);
  const $ = load(html);

  const title = $('h1.entry-title, .series-title h1').first().text().trim();
  const coverUrl = $('.thumb img, .series-thumb img').first().attr('src') || 
                   $('.thumb img, .series-thumb img').first().attr('data-src');
  const description = $('.entry-content[itemprop="description"], .series-synops').first().text().trim();
  
  // Extract metadata from info table
  let status = 'Ongoing';
  let type = 'manga';
  let rating: number | undefined;
  const genres: string[] = [];
  let author: string | undefined;

  $('.tsinfo .imptdt, .serl').each((_, el) => {
    const text = $(el).text().toLowerCase();
    if (text.includes('status')) {
      status = $(el).text().includes('Ongoing') || $(el).text().includes('Publishing') 
        ? 'Ongoing' 
        : 'Completed';
    }
    if (text.includes('type')) {
      const typeText = $(el).text().toLowerCase();
      if (typeText.includes('manhwa')) type = 'manhwa';
      else if (typeText.includes('manhua')) type = 'manhua';
      else if (typeText.includes('novel')) type = 'novel';
    }
    if (text.includes('author') || text.includes('pengarang')) {
      author = $(el).find('span').last().text().trim() || $(el).contents().last().text().trim();
    }
  });

  $('.mgen a, .series-genres a').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  // Extract rating
  const ratingText = $('.rating-prc, .num[itemprop="ratingValue"]').first().text().trim();
  if (ratingText) {
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      if (rating > 10) rating = rating / 10;
    }
  }

  // Extract chapters
  const chapters: RemoteChapterSummary[] = [];
  $('#chapterlist li, .eplister li').each((_, el) => {
    const $chapter = $(el);
    const chapterUrl = $chapter.find('a').attr('href');
    const chapterTitle = $chapter.find('.chapternum, .epl-num, .chbox .eph-num span').first().text().trim();
    
    if (chapterUrl && chapterTitle) {
      chapters.push({
        sourceUrl: chapterUrl,
        sourceChapterId: chapterUrl.split('/').filter(Boolean).pop() || '',
        chapterNumber: extractChapterNumber(chapterTitle),
        title: chapterTitle,
      });
    }
  });

  console.log(`Manhwalist: Found ${chapters.length} chapters for "${title}"`);
  
  return { title, coverUrl, description, status, type, rating, genres, author, chapters };
}

function scrapeManhwalistPages($: any): string[] {
  const images: string[] = [];
  
  $('#readerarea img, .rdminimal img, .reader-area img').each((_: any, el: any) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (src && !src.includes('loader') && !src.includes('placeholder')) {
      images.push(src);
    }
  });

  return images;
}

// ===== SHINIGAMI =====
async function scrapeShinigami(url: string): Promise<RemoteComicDetail> {
  const html = await safeFetch(url);
  const $ = load(html);

  const title = $('h1.entry-title, .series-title').first().text().trim();
  const coverUrl = $('.thumb img, .series-thumb img').first().attr('src') ||
                   $('.thumb img, .series-thumb img').first().attr('data-src');
  const description = $('.entry-content-single, .series-synops, .summary__content p').first().text().trim();
  
  let status = 'Ongoing';
  let type = 'manga';
  let rating: number | undefined;
  const genres: string[] = [];
  let author: string | undefined;

  $('.info-content .spe span, .tsinfo .imptdt').each((_, el) => {
    const text = $(el).text().toLowerCase();
    if (text.includes('status')) {
      status = text.includes('ongoing') || text.includes('publishing') ? 'Ongoing' : 'Completed';
    }
    if (text.includes('type')) {
      if (text.includes('manhwa')) type = 'manhwa';
      else if (text.includes('manhua')) type = 'manhua';
      else if (text.includes('novel')) type = 'novel';
    }
    if (text.includes('author') || text.includes('pengarang')) {
      author = $(el).find('span').last().text().trim() || $(el).contents().last().text().trim();
    }
  });

  $('.genre-info a, .genxed a, .mgen a').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  const ratingText = $('.rating-prc, .num[itemprop="ratingValue"]').first().text().trim();
  if (ratingText) {
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      if (rating > 10) rating = rating / 10;
    }
  }

  const chapters: RemoteChapterSummary[] = [];
  $('.eplister li, #chapterlist li').each((_, el) => {
    const $chapter = $(el);
    const chapterUrl = $chapter.find('a').attr('href');
    const chapterTitle = $chapter.find('.epl-num, .chapternum').text().trim();
    
    if (chapterUrl && chapterTitle) {
      chapters.push({
        sourceUrl: chapterUrl,
        sourceChapterId: chapterUrl.split('/').filter(Boolean).pop() || '',
        chapterNumber: extractChapterNumber(chapterTitle),
        title: chapterTitle,
      });
    }
  });

  console.log(`Shinigami: Found ${chapters.length} chapters for "${title}"`);
  
  return { title, coverUrl, description, status, type, rating, genres, author, chapters };
}

function scrapeShinigamiPages($: any): string[] {
  const images: string[] = [];
  
  $('#readerarea img, .rdminimal img, .reader-area img').each((_: any, el: any) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (src && !src.includes('loader') && !src.includes('placeholder')) {
      images.push(src);
    }
  });

  return images;
}

// ===== KOMIKCAST =====
async function scrapeKomikcast(url: string): Promise<RemoteComicDetail> {
  const html = await safeFetch(url);
  const $ = load(html);

  const title = $('.komik_info-content-body h1, h1.entry-title').first().text().trim();
  const coverUrl = $('.komik_info-content-thumbnail img, .thumb img').first().attr('src') ||
                   $('.komik_info-content-thumbnail img, .thumb img').first().attr('data-src');
  const description = $('.komik_info-description-sinopsis, .entry-content').first().text().trim();
  
  let status = 'Ongoing';
  let type = 'manga';
  let rating: number | undefined;
  const genres: string[] = [];
  let author: string | undefined;

  $('.komik_info-content-info span, .tsinfo .imptdt').each((_, el) => {
    const text = $(el).text().toLowerCase();
    if (text.includes('status')) {
      status = text.includes('ongoing') || text.includes('publishing') ? 'Ongoing' : 'Completed';
    }
    if (text.includes('type') || text.includes('tipe')) {
      if (text.includes('manhwa')) type = 'manhwa';
      else if (text.includes('manhua')) type = 'manhua';
      else if (text.includes('novel')) type = 'novel';
    }
    if (text.includes('author') || text.includes('pengarang')) {
      author = $(el).find('b, span').last().text().trim() || $(el).contents().last().text().trim();
    }
  });

  $('.komik_info-content-genre a, .mgen a').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  const ratingText = $('.data-rating, .rating-prc').first().text().trim();
  if (ratingText) {
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      if (rating > 10) rating = rating / 10;
    }
  }

  const chapters: RemoteChapterSummary[] = [];
  $('.komik_info-chapters-item, #chapterlist li').each((_, el) => {
    const $chapter = $(el);
    const chapterUrl = $chapter.find('a').attr('href');
    const chapterTitle = $chapter.find('.chapter-link-item, .chapternum').text().trim();
    
    if (chapterUrl && chapterTitle) {
      chapters.push({
        sourceUrl: chapterUrl,
        sourceChapterId: chapterUrl.split('/').filter(Boolean).pop() || '',
        chapterNumber: extractChapterNumber(chapterTitle),
        title: chapterTitle,
      });
    }
  });

  console.log(`Komikcast: Found ${chapters.length} chapters for "${title}"`);
  
  return { title, coverUrl, description, status, type, rating, genres, author, chapters };
}

function scrapeKomikcastPages($: any): string[] {
  const images: string[] = [];
  
  $('#readerarea img, .main-reading-area img, .chapter-content img').each((_: any, el: any) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (src && !src.includes('loader') && !src.includes('placeholder')) {
      images.push(src);
    }
  });

  return images;
}
