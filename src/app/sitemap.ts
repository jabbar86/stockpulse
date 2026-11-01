import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo/site-config';
import { CALCULATORS, PUBLIC_STOCK_SYMBOLS, isNifty50, stockPath } from '@/lib/seo/public-pages';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.65,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${base}/stock`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...PUBLIC_STOCK_SYMBOLS.map((symbol) => ({
      url: `${base}${stockPath(symbol)}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: isNifty50(symbol) ? 0.8 : 0.7,
    })),
    {
      url: `${base}/calculators`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...CALCULATORS.map((c) => ({
      url: `${base}/calculators/${c.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
