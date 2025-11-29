// Enhanced HTTP Client with Rotating Headers and Retry Logic

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0',
];

const lastRequestTime: Record<string, number> = {};
const MIN_DELAY_MS = 2000; // 2 seconds between requests to same domain
const MAX_RETRIES = 3;

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const REFERERS = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://duckduckgo.com/',
  'https://www.reddit.com/',
];

function getRandomReferer(): string {
  return REFERERS[Math.floor(Math.random() * REFERERS.length)];
}

function getSmartHeaders(url: string, referer?: string): Record<string, string> {
  const hostname = new URL(url).hostname;
  
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'Referer': referer || getRandomReferer(),
    'Origin': `https://${hostname}`,
    'Cookie': `session_id=${Math.random().toString(36).substring(7)}; _ga=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Date.now()}`,
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe fetch with rate limiting, retry logic, and smart headers
 * V3 - Enhanced with rotating headers, cookies, and better error handling
 */
export async function safeFetch(url: string, options?: { referer?: string; retries?: number }): Promise<string> {
  const hostname = new URL(url).hostname;
  const maxRetries = options?.retries ?? MAX_RETRIES;
  
  console.log(`[SCRAPER V3] Starting fetch for: ${url}`);
  console.log(`[SCRAPER V3] Max retries: ${maxRetries}`);
  
  // Rate limiting per domain
  const now = Date.now();
  const lastTime = lastRequestTime[hostname] || 0;
  const timeSinceLastRequest = now - lastTime;
  
  if (timeSinceLastRequest < MIN_DELAY_MS) {
    const delay = MIN_DELAY_MS - timeSinceLastRequest;
    console.log(`[SCRAPER V3] Rate limit: waiting ${delay}ms for ${hostname}`);
    await sleep(delay);
  }
  
  lastRequestTime[hostname] = Date.now();
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const headers = getSmartHeaders(url, options?.referer);
      console.log(`[SCRAPER V3] Attempt ${attempt}/${maxRetries} - Using UA: ${headers['User-Agent'].substring(0, 50)}...`);
      console.log(`[SCRAPER V3] Referer: ${headers['Referer']}`);
      
      const response = await fetch(url, {
        headers,
        redirect: 'follow',
      });

      console.log(`[SCRAPER V3] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        if (response.status === 403 || response.status === 503) {
          throw new Error(`BLOCKED: HTTP ${response.status} - ${response.statusText} (may need Playwright fallback)`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Check if HTML is valid and not empty
      if (!html || html.length < 100) {
        throw new Error(`Empty or invalid HTML response (${html.length} bytes)`);
      }
      
      // Check for Cloudflare challenge
      if (html.includes('cf-challenge') || html.includes('Just a moment')) {
        throw new Error('Cloudflare challenge detected - need Playwright fallback');
      }
      
      console.log(`[SCRAPER V3] ✓ Successfully fetched ${url} (${html.length} bytes)`);
      console.log(`[SCRAPER V3] ✓ Selector detection: ${detectContentType(html)}`);
      return html;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[SCRAPER V3] ✗ Fetch error (attempt ${attempt}/${maxRetries}):`, lastError.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const backoffMs = MIN_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[SCRAPER V3] Retrying in ${backoffMs}ms with different headers...`);
        await sleep(backoffMs);
      }
    }
  }
  
  console.error(`[SCRAPER V3] ✗✗✗ Failed to fetch ${url} after ${maxRetries} attempts`);
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}

/**
 * Detect content type for debugging
 */
function detectContentType(html: string): string {
  if (html.includes('cf-challenge')) return 'Cloudflare Challenge';
  if (html.includes('captcha')) return 'Captcha Page';
  if (html.includes('<title>')) return 'Valid HTML';
  return 'Unknown Content';
}

/**
 * Extract slug from URL
 */
export function extractSlugFromUrl(url: string): string {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

/**
 * Extract chapter number from various formats
 * V3 - Enhanced to support more formats
 */
export function extractChapterNumber(text: string): number {
  console.log(`[SCRAPER V3] Extracting chapter number from: "${text}"`);
  
  // Clean the text first
  const cleanText = text.trim().toLowerCase();
  
  // Try to find patterns like "Chapter 123", "Ch. 123", "Ep 7", "#15", "12.1", etc.
  const patterns = [
    /chapter[:\s-]*(\d+\.?\d*)/i,
    /ch\.?\s*(\d+\.?\d*)/i,
    /ep\.?\s*(\d+\.?\d*)/i,
    /episode[:\s-]*(\d+\.?\d*)/i,
    /#\s*(\d+\.?\d*)/,
    /^(\d+\.?\d*)$/,  // Just a number
    /(\d+\.?\d*)\s*-/,  // "12.5 - Title"
  ];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const chapterNum = parseFloat(match[1]);
      console.log(`[SCRAPER V3] ✓ Found chapter number: ${chapterNum}`);
      return chapterNum;
    }
  }

  console.log(`[SCRAPER V3] ✗ Could not extract chapter number, returning 0`);
  return 0;
}

/**
 * Slugify text for URL-friendly format
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
