// Simple rate limiter per domain
const lastRequestTime: Record<string, number> = {};
const MIN_DELAY_MS = 2000; // 2 seconds between requests to same domain

/**
 * Safe fetch with rate limiting and proper headers
 */
export async function safeFetch(url: string): Promise<string> {
  const hostname = new URL(url).hostname;
  
  // Rate limiting per domain
  const now = Date.now();
  const lastTime = lastRequestTime[hostname] || 0;
  const timeSinceLastRequest = now - lastTime;
  
  if (timeSinceLastRequest < MIN_DELAY_MS) {
    const delay = MIN_DELAY_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime[hostname] = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
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
 * Generate slug from title
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
