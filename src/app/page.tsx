import type { Metadata } from 'next';
import { LandingMarketing } from '@/components/landing/landing-marketing';
import { siteUrl, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site-config';

const base = siteUrl();
const homeTitle = 'AI stock analysis & portfolio tracker for India';

export const metadata: Metadata = {
  title: homeTitle,
  description: SITE_TAGLINE,
  alternates: {
    canonical: `${base}/`,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: `${base}/`,
    title: `${SITE_NAME} — ${homeTitle}`,
    description: SITE_TAGLINE,
    siteName: SITE_NAME,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE_NAME} — Indian stock analysis` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${homeTitle}`,
    description: SITE_TAGLINE,
    images: [`${base}/opengraph-image`],
  },
};

export default function HomePage() {
  return <LandingMarketing />;
}
