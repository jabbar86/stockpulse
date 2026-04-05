import type { MetadataRoute } from 'next';
import { siteUrl, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site-config';

/** PWA manifest — improves mobile rich results and install prompts. */
export default function manifest(): MetadataRoute.Manifest {
  const base = siteUrl();
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_TAGLINE,
    start_url: '/',
    id: base,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0f172a',
    theme_color: '#1e40af',
    lang: 'en-IN',
    categories: ['finance', 'business', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
    ],
  };
}
