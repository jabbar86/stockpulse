import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site-config';

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
        disallow: [
          '/api/',
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
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
