import { NextRequest, NextResponse } from 'next/server';
import { scrapeNews } from '@/lib/scraper/news-scraper';

// Secret to protect the cron endpoint (optional — set CRON_SECRET in .env.local)
const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/cron/scrape-news  — triggered by cron scheduler or manual call
export async function GET(request: NextRequest) {
  // If CRON_SECRET is set, require it via query param or Authorization header
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = new URL(request.url).searchParams.get('secret');
    if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await scrapeNews();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron] scrape-news failed:', error);
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 });
  }
}
