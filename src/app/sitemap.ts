import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stockpulse.app';

  const routes = ['', '/dashboard', '/market', '/portfolio', '/stocks', '/news', '/support'].map(
    (path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: path === '' || path === '/dashboard' ? 1 : 0.7,
    })
  );

  return routes;
}

