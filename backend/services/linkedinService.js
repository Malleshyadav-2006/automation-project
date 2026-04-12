import dotenv from 'dotenv';
dotenv.config();

/**
 * Scrapes a LinkedIn public profile page and extracts available info
 * from meta tags, OG tags, title, and JSON-LD structured data.
 * 
 * ✅ 100% FREE — no paid APIs, no Chrome/Puppeteer needed.
 * Works by reading the HTML meta-data that LinkedIn includes even
 * on the public/auth-wall version of every profile.
 */
export async function scrapeLinkedInProfile(profileUrl) {
  const url = normalizeUrl(profileUrl);

  if (!url.includes('linkedin.com/in/')) {
    throw new Error('Not a valid LinkedIn profile URL. Expected format: linkedin.com/in/username');
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };

  let html;
  try {
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`LinkedIn returned HTTP ${response.status}`);
    }

    html = await response.text();
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new Error('LinkedIn request timed out. Try again.');
    }
    throw new Error(`Could not reach LinkedIn: ${err.message}`);
  }

  const profile = extractProfileData(html, url);

  // Validate we got something useful
  if (!profile.name && !profile.headline && !profile.summary) {
    throw new Error('Could not extract profile data. LinkedIn may have blocked the request. Try pasting the person\'s info manually.');
  }

  return profile;
}

// ─── URL NORMALIZATION ──────────────────────────────────────────────────────
function normalizeUrl(url) {
  let cleaned = url.trim();

  // Remove any query params or fragments
  cleaned = cleaned.split('?')[0].split('#')[0];

  if (!cleaned.startsWith('http')) {
    cleaned = 'https://' + cleaned;
  }

  // Ensure https
  cleaned = cleaned.replace(/^http:\/\//, 'https://');

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  return cleaned;
}

// ─── PROFILE DATA EXTRACTION ────────────────────────────────────────────────
function extractProfileData(html, url) {
  const data = {
    name: '',
    headline: '',
    company: '',
    location: '',
    summary: '',
    profileUrl: url,
  };

  // 1️⃣ Extract from <title> — "FirstName LastName - Headline - Company | LinkedIn"
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const title = decode(titleMatch[1]).trim();
    // Split by " - " or " | " or " – "
    const parts = title
      .replace(/\s*\|\s*LinkedIn\s*$/i, '')  // Remove "| LinkedIn" suffix
      .replace(/\s*[-–]\s*LinkedIn\s*$/i, '') // Remove "- LinkedIn" suffix
      .split(/\s*[-–]\s*/)
      .map(p => p.trim())
      .filter(Boolean);

    if (parts.length >= 1) data.name = parts[0];
    if (parts.length >= 2) data.headline = parts[1];
    if (parts.length >= 3) data.company = parts[2];
  }

  // 2️⃣ Extract og:title — "Name - Headline"
  const ogTitle = extractMetaProperty(html, 'og:title');
  if (ogTitle) {
    const parts = ogTitle
      .replace(/\s*\|\s*LinkedIn\s*$/i, '')
      .replace(/\s*[-–]\s*LinkedIn\s*$/i, '')
      .split(/\s*[-–]\s*/)
      .map(p => p.trim())
      .filter(Boolean);

    if (!data.name && parts.length >= 1) data.name = parts[0];
    if (!data.headline && parts.length >= 2) data.headline = parts[1];
  }

  // 3️⃣ Extract og:description or meta description — contains the summary
  const ogDesc = extractMetaProperty(html, 'og:description');
  const metaDesc = extractMetaName(html, 'description');
  let rawSummary = ogDesc || metaDesc || '';

  // Clean up LinkedIn boilerplate from the description
  rawSummary = rawSummary
    .replace(/^View\s+.+?['']s\s+(full\s+)?profile\s+on\s+LinkedIn.*?[.·]\s*/i, '')
    .replace(/LinkedIn\s+is\s+the\s+world['']s\s+largest.*/i, '')
    .replace(/Join LinkedIn today.*$/i, '')
    .replace(/Sign up today.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (rawSummary) {
    data.summary = rawSummary;
  }

  // 4️⃣ Try JSON-LD structured data (sometimes present)
  const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const jsonLd = JSON.parse(match[1]);
      if (jsonLd['@type'] === 'Person' || jsonLd['@type']?.includes?.('Person')) {
        data.name = data.name || jsonLd.name || '';
        data.headline = data.headline || jsonLd.jobTitle || '';
        data.location = data.location || jsonLd.address?.addressLocality || '';
        if (jsonLd.worksFor) {
          const org = Array.isArray(jsonLd.worksFor) ? jsonLd.worksFor[0] : jsonLd.worksFor;
          data.company = data.company || org?.name || '';
        }
        if (jsonLd.description) {
          data.summary = data.summary || jsonLd.description;
        }
      }
    } catch { /* skip invalid JSON-LD */ }
  }

  // 5️⃣ Try to extract location from the page text
  if (!data.location) {
    const locMatch = html.match(/(?:location|geo)[^>]*>([^<]{2,80})</i);
    if (locMatch) data.location = decode(locMatch[1]).trim();
  }

  // 6️⃣ Infer company from headline if not found
  if (!data.company && data.headline) {
    // Common patterns: "Role at Company" or "Role @ Company"
    const atMatch = data.headline.match(/(?:at|@|,)\s+(.+)$/i);
    if (atMatch) {
      data.company = atMatch[1].trim();
    }
  }

  return data;
}

// ─── META TAG HELPERS ───────────────────────────────────────────────────────
function extractMetaProperty(html, property) {
  // Try property="..." content="..."
  const r1 = new RegExp(`<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m1 = html.match(r1);
  if (m1) return decode(m1[1]);

  // Try content="..." property="..."
  const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegex(property)}["']`, 'i');
  const m2 = html.match(r2);
  return m2 ? decode(m2[1]) : '';
}

function extractMetaName(html, name) {
  const r1 = new RegExp(`<meta[^>]+name=["']${escapeRegex(name)}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m1 = html.match(r1);
  if (m1) return decode(m1[1]);

  const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRegex(name)}["']`, 'i');
  const m2 = html.match(r2);
  return m2 ? decode(m2[1]) : '';
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decode(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}
