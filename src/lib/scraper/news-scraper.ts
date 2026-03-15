import * as cheerio from 'cheerio';
import { createServiceRoleClient } from '@/lib/supabase/server';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-IN,en;q=0.9',
};

interface Article {
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: string;
  image_url: string | null;
  published_at: string;
}

// ── Category detection ──

const CATEGORY_PATTERNS: [string, RegExp][] = [
  ['ipo', /\bipo\b|initial public offer/i],
  ['mutual-funds', /\bmutual[\s-]?fund/i],
  ['crypto', /\bcrypto|bitcoin|ethereum|blockchain/i],
  ['economy', /\bgdp\b|inflation|rbi|fiscal|monetary policy|economy|economic/i],
  ['stocks', /\bshare price|stock tip|buy|sell|target price|multibagger|smallcap|midcap|largecap/i],
  ['markets', /\bsensex|nifty|market|bse|nse|bull|bear|rally|correction/i],
];

function categorize(text: string): string {
  for (const [cat, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return cat;
  }
  return 'general';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPage(url: string): Promise<any> {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    return cheerio.load(html);
  } catch (err) {
    console.error(`[scraper] Failed to fetch ${url}:`, err);
    return null;
  }
}

// ── Moneycontrol ──

async function scrapeMoneycontrol(): Promise<Article[]> {
  const url = 'https://www.moneycontrol.com/news/business/markets/';
  console.log('[scraper] Scraping Moneycontrol...');
  const $ = await fetchPage(url);
  if (!$) return [];

  const articles: Article[] = [];
  let items = $('#caget498 li.clearfix');
  if (!items.length) items = $('li.clearfix');

  items.each((_: number, el: cheerio.Element) => {
    try {
      const linkEl = $(el).find('h2 a').first();
      if (!linkEl.length) return;

      const title = linkEl.text().trim();
      let href = (linkEl.attr('href') || '').trim();
      if (!title || !href) return;
      if (href.startsWith('/')) href = 'https://www.moneycontrol.com' + href;
      if (!/\/news\/|\/article\//.test(href)) return;

      const summary = $(el).find('p').first().text().trim();
      const imgEl = $(el).find('img').first();
      const imageUrl = (imgEl.attr('data-src') || imgEl.attr('src') || '').trim();

      articles.push({
        title: title.slice(0, 500),
        summary: summary.slice(0, 1000) || null,
        url: href,
        source: 'moneycontrol',
        category: categorize(title + ' ' + summary),
        image_url: imageUrl || null,
        published_at: new Date().toISOString(),
      });
    } catch {
      // skip malformed items
    }
  });

  console.log(`[scraper] Moneycontrol: ${articles.length} articles`);
  return articles;
}

// ── Economic Times ──

async function scrapeEconomicTimes(): Promise<Article[]> {
  const url = 'https://economictimes.indiatimes.com/markets/stocks/news';
  console.log('[scraper] Scraping Economic Times...');
  const $ = await fetchPage(url);
  if (!$) return [];

  const articles: Article[] = [];
  let items = $('div.eachStory');
  if (!items.length) items = $('div.story-box');
  if (!items.length) items = $('div.clr');

  items.each((_: number, el: cheerio.Element) => {
    try {
      const linkEl = $(el).find('a[href]').first();
      if (!linkEl.length) return;

      const hEl = $(el).find('h3, h2, h4').first();
      const title = (hEl.length ? hEl.text().trim() : linkEl.text().trim());
      let href = (linkEl.attr('href') || '').trim();
      if (!title || !href) return;
      if (href.startsWith('/')) href = 'https://economictimes.indiatimes.com' + href;
      if (!/\/articleshow\/|\/news\//.test(href)) return;

      const summary = $(el).find('p').first().text().trim();
      const imgEl = $(el).find('img').first();
      const imageUrl = (imgEl.attr('data-src') || imgEl.attr('src') || '').trim();

      articles.push({
        title: title.slice(0, 500),
        summary: summary.slice(0, 1000) || null,
        url: href,
        source: 'economic-times',
        category: categorize(title + ' ' + summary),
        image_url: imageUrl || null,
        published_at: new Date().toISOString(),
      });
    } catch {
      // skip malformed items
    }
  });

  console.log(`[scraper] Economic Times: ${articles.length} articles`);
  return articles;
}

// ── Insert into Supabase ──

async function insertArticles(articles: Article[]): Promise<number> {
  if (!articles.length) return 0;

  const supabase = createServiceRoleClient();
  let inserted = 0;

  for (const article of articles) {
    try {
      const { data } = await supabase
        .from('market_news')
        .upsert(article, { onConflict: 'url', ignoreDuplicates: true });
      if (data) inserted++;
    } catch {
      // duplicate or other error — skip
    }
  }

  return inserted;
}

// ── Public API ──

export async function scrapeNews(): Promise<{ scraped: number; inserted: number }> {
  console.log('[scraper] Starting news scrape...');

  const [mc, et] = await Promise.all([
    scrapeMoneycontrol(),
    scrapeEconomicTimes(),
  ]);

  const all = [...mc, ...et];

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = all.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  console.log(`[scraper] Total: ${all.length}, unique: ${unique.length}`);

  const inserted = await insertArticles(unique);
  console.log(`[scraper] Inserted: ${inserted}`);

  return { scraped: unique.length, inserted };
}
