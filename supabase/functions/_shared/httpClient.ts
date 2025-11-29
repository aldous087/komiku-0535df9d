// Enhanced HTTP Client with Rotating Headers and Retry Logic

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const lastRequestTime: Record<string, number> = {};
const MIN_DELAY_MS = 2000; // 2 seconds between requests to same domain
const MAX_RETRIES = 3;

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getSmartHeaders(referer?: string): Record<string, string> {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
    ...(referer ? { 'Referer': referer } : {}),
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe fetch with rate limiting, retry logic, and smart headers
 */
export async function safeFetch(url: string, options?: { referer?: string; retries?: number }): Promise<string> {
  const hostname = new URL(url).hostname;
  const maxRetries = options?.retries ?? MAX_RETRIES;
  
  // Rate limiting per domain
  const now = Date.now();
  const lastTime = lastRequestTime[hostname] || 0;
  const timeSinceLastRequest = now - lastTime;
  
  if (timeSinceLastRequest < MIN_DELAY_MS) {
    const delay = MIN_DELAY_MS - timeSinceLastRequest;
    await sleep(delay);
  }
  
  lastRequestTime[hostname] = Date.now();
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching ${url} (attempt ${attempt}/${maxRetries})`);
      
      const response = await fetch(url, {
        headers: getSmartHeaders(options?.referer),
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`Successfully fetched ${url} (${html.length} bytes)`);
      return html;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Fetch error for ${url} (attempt ${attempt}/${maxRetries}):`, lastError.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const backoffMs = MIN_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
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
 */
export function extractChapterNumber(text: string): number {
  // Try to find patterns like "Chapter 123", "Ch. 123", "123", etc.
  const patterns = [
    /chapter[:\s-]*(\d+\.?\d*)/i,
    /ch\.?\s*(\d+\.?\d*)/i,
    /ep\.?\s*(\d+\.?\d*)/i,
    /(\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }

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
