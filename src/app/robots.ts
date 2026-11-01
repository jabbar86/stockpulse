import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site-config';

/** Logged-in app surfaces and APIs — never worth crawling. */
const PRIVATE_PATHS = [
  '/api/',
  '/auth/',
  '/dashboard',
  '/today',
  '/stocks',
  '/portfolio',
  '/brokers',
  '/market',
  '/news',
  '/mutual-funds',
  '/profile',
  '/support',
  '/tools',
  '/screener',
  '/algo',
];

/**
 * SEO/scraper bots that crawl aggressively and send no search traffic. They respect robots.txt,
 * so blocking them here saves function CPU and data-provider calls on `/stock/*` pages.
 */
const HEAVY_BOTS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'PetalBot',
  'Bytespider',
  'DataForSeoBot',
  'BLEXBot',
  'MegaIndex',
  'serpstatbot',
];

/**
 * Crawl hints: keep API and authenticated app surfaces out of the index; expose sitemap for discovery.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        // Bing/Yandex honour crawl-delay (Google ignores it and self-throttles).
        userAgent: ['Bingbot', 'YandexBot'],
        allow: '/',
        disallow: PRIVATE_PATHS,
        crawlDelay: 5,
      },
      {
        userAgent: HEAVY_BOTS,
        disallow: '/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
