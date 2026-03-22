import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site-config';

/**
 * Crawl hints: keep API and auth callback noise out of the index; expose sitemap for discovery.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
