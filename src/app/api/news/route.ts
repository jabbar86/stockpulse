import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { scrapeNews } from '@/lib/scraper/news-scraper';
import { isNewsRefreshWindow } from '@/lib/market/nse-session';

const SCRAPE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
let lastScrapeAt = 0;
let scrapeInProgress = false;

/** Trigger a background scrape if stale and during IST news window */
function maybeScrapeInBackground() {
  const now = Date.now();
  if (!isNewsRefreshWindow()) return;
  if (now - lastScrapeAt < SCRAPE_INTERVAL_MS) return;
  if (scrapeInProgress) return;

  scrapeInProgress = true;
  lastScrapeAt = now;

  scrapeNews()
    .then((result) => {
      console.log(`[news] Background scrape done: ${result.scraped} scraped, ${result.inserted} inserted`);
    })
    .catch((err) => {
      console.error('[news] Background scrape failed:', err);
    })
    .finally(() => {
      scrapeInProgress = false;
    });
}

// GET /api/news?category=...&limit=50&offset=0
export async function GET(request: NextRequest) {
  try {
    // Fire-and-forget: scrape fresh news in background if stale (IST weekday 9–16)
    maybeScrapeInBackground();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('market_news')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('News fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch news' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      news: data ?? [],
      total: count ?? 0,
      lastScrapedAt: lastScrapeAt > 0 ? new Date(lastScrapeAt).toISOString() : null,
    });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
