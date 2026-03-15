export async function register() {
  // Only run cron on the server (Node.js runtime), not during build or on Edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron');

    // Scrape news every day at 6:47 AM and 6:47 PM IST
    // node-cron uses server timezone — these expressions assume IST or adjust accordingly
    cron.default.schedule('47 6,18 * * *', async () => {
      console.log('[cron] Running scheduled news scrape...');
      try {
        const { scrapeNews } = await import('@/lib/scraper/news-scraper');
        const result = await scrapeNews();
        console.log(`[cron] News scrape complete: ${result.scraped} scraped, ${result.inserted} inserted`);
      } catch (err) {
        console.error('[cron] News scrape failed:', err);
      }
    });

    console.log('[cron] News scraper scheduled: 6:47 AM & 6:47 PM daily');
  }
}
