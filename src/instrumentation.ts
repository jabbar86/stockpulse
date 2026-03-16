// Instrumentation hook — intentionally empty.
// News scraping is handled by:
// 1. Vercel cron (vercel.json) hitting /api/cron/scrape-news
// 2. Auto-scrape in /api/news during market hours
export async function register() {}
