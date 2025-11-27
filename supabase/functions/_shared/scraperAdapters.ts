import { load } from 'https://esm.sh/cheerio@1.0.0-rc.12';
import { safeFetch, extractChapterNumber } from './httpClient.ts';

export interface RemoteComicDetail {
  title: string;
  coverUrl?: string;
  description?: string;
  status?: string;
  type?: string;
  rating?: number;
  genres?: string[];
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
 * Scrape comic detail based on source code
 */
export async function scrapeComicDetail(
  sourceCode: string,
  url: string
): Promise<RemoteComicDetail> {
  switch (sourceCode) {
    case 'MANHWALIST':
      return scrapeManhwalist(url);
    case 'SHINIGAMI':
      return scrapeShinigami(url);
    case 'KOMIKCAST':
      return scrapeKomikcast(url);
    default:
      throw new Error(`Unsupported source: ${sourceCode}`);
  }
}

/**
 * Scrape chapter pages based on source code
 */
export async function scrapeChapterPages(
  sourceCode: string,
  url: string
): Promise<RemoteChapterPage[]> {
  const html = await safeFetch(url);
  const $ = load(html);

  switch (sourceCode) {
    case 'MANHWALIST':
      return scrapeManhwalistPages($, url);
    case 'SHINIGAMI':
      return scrapeShinigamiPages($, url);
    case 'KOMIKCAST':
      return scrapeKomikcastPages($, url);
    default:
      throw new Error(`Unsupported source: ${sourceCode}`);
  }
}

// ===== MANHWALIST =====
async function scrapeManhwalist(url: string): Promise<RemoteComicDetail> {
  const html = await safeFetch(url);
  const $ = load(html);

  const title = $('.entry-title').first().text().trim();
  const coverUrl = $('.thumb img').first().attr('src');
  const description = $('.entry-content[itemprop="description"]').first().text().trim();
  
  // Extract metadata
  const infoItems = $('.tsinfo .imptdt');
  let status = 'Ongoing';
  let type = 'manga';
  let rating: number | undefined;
  const genres: string[] = [];

  infoItems.each((_, el) => {
    const label = $(el).find('i').text().trim().toLowerCase();
    const value = $(el).contents().filter((_, node) => node.type === 'text').text().trim();
    
    if (label.includes('status')) status = value;
    if (label.includes('type')) type = value.toLowerCase();
  });

  $('.mgen a').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  // Extract rating
  const ratingText = $('.rating-prc').first().text().trim();
  if (ratingText) {
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
  }

  // Extract chapters
  const chapters: RemoteChapterSummary[] = [];
  $('#chapterlist li').each((_, el) => {
    const $chapter = $(el);
    const chapterUrl = $chapter.find('a').attr('href');
    const chapterTitle = $chapter.find('.chapternum').text().trim();
    const chapterNumber = extractChapterNumber(chapterTitle);

    if (chapterUrl) {
      chapters.push({
        sourceUrl: chapterUrl,
        sourceChapterId: chapterUrl.split('/').filter(Boolean).pop() || '',
        chapterNumber,
        title: chapterTitle,
      });
    }
  });

  return { title, coverUrl, description, status, type, rating, genres, chapters };
}

function scrapeManhwalistPages($: any, url: string): RemoteChapterPage[] {
  const pages: RemoteChapterPage[] = [];
  
  $('#readerarea img').each((index: number, el: any) => {
    const src = $(el).attr('src');
    if (src && !src.includes('loader')) {
      pages.push({
        pageNumber: index + 1,
        imageUrl: src,
      });
    }
  });

  return pages;
}

// ===== SHINIGAMI =====
async function scrapeShinigami(url: string): Promise<RemoteComicDetail> {
  const html = await safeFetch(url);
  const $ = load(html);

  const title = $('h1.entry-title').first().text().trim();
  const coverUrl = $('.thumb img').first().attr('src');
  const description = $('.entry-content-single').first().text().trim();
  
  let status = 'Ongoing';
  let type = 'manga';
  let rating: number | undefined;
  const genres: string[] = [];

  $('.info-content .spe span').each((_, el) => {
    const label = $(el).find('b').text().trim().toLowerCase();
    const value = $(el).contents().filter((_, node) => node.type === 'text').text().trim();
    
    if (label.includes('status')) status = value;
    if (label.includes('type')) type = value.toLowerCase();
  });

  $('.genre-info a').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  const ratingText = $('.rating-prc').first().text().trim();
  if (ratingText) {
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
  }

  const chapters: RemoteChapterSummary[] = [];
  $('.eplister li').each((_, el) => {
    const $chapter = $(el);
    const chapterUrl = $chapter.find('a').attr('href');
    const chapterTitle = $chapter.find('.epl-num').text().trim();
    const chapterNumber = extractChapterNumber(chapterTitle);

    if (chapterUrl) {
      chapters.push({
        sourceUrl: chapterUrl,
        sourceChapterId: chapterUrl.split('/').filter(Boolean).pop() || '',
        chapterNumber,
        title: chapterTitle,
      });
    }
  });

  return { title, coverUrl, description, status, type, rating, genres, chapters };
}

function scrapeShinigamiPages($: any, url: string): RemoteChapterPage[] {
  const pages: RemoteChapterPage[] = [];
  
  $('#readerarea img').each((index: number, el: any) => {
    const src = $(el).attr('src');
    if (src && !src.includes('loader')) {
      pages.push({
        pageNumber: index + 1,
        imageUrl: src,
      });
    }
  });

  return pages;
}

// ===== KOMIKCAST =====
async function scrapeKomikcast(url: string): Promise<RemoteComicDetail> {
  const html = await safeFetch(url);
  const $ = load(html);

  const title = $('.komik_info-content-body h1').first().text().trim();
  const coverUrl = $('.komik_info-content-thumbnail img').first().attr('src');
  const description = $('.komik_info-description-sinopsis').first().text().trim();
  
  let status = 'Ongoing';
  let type = 'manga';
  let rating: number | undefined;
  const genres: string[] = [];

  $('.komik_info-content-info span').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.includes('status:')) {
      status = $(el).find('b').text().trim();
    }
    if (text.includes('type:')) {
      type = $(el).find('b').text().trim().toLowerCase();
    }
  });

  $('.komik_info-content-genre a').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  const ratingText = $('.data-rating').first().text().trim();
  if (ratingText) {
    const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
  }

  const chapters: RemoteChapterSummary[] = [];
  $('.komik_info-chapters-item').each((_, el) => {
    const $chapter = $(el);
    const chapterUrl = $chapter.find('a').attr('href');
    const chapterTitle = $chapter.find('.chapter-link-item').text().trim();
    const chapterNumber = extractChapterNumber(chapterTitle);

    if (chapterUrl) {
      chapters.push({
        sourceUrl: chapterUrl,
        sourceChapterId: chapterUrl.split('/').filter(Boolean).pop() || '',
        chapterNumber,
        title: chapterTitle,
      });
    }
  });

  return { title, coverUrl, description, status, type, rating, genres, chapters };
}

function scrapeKomikcastPages($: any, url: string): RemoteChapterPage[] {
  const pages: RemoteChapterPage[] = [];
  
  $('#readerarea img, .main-reading-area img').each((index: number, el: any) => {
    const src = $(el).attr('src');
    if (src && !src.includes('loader')) {
      pages.push({
        pageNumber: index + 1,
        imageUrl: src,
      });
    }
  });

  return pages;
}
