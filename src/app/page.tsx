import type { Metadata } from 'next';
import { LandingMarketing } from '@/components/landing/landing-marketing';
import { siteUrl, SITE_TAGLINE } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'AI stock analysis & portfolio tracker for India',
  description: SITE_TAGLINE,
  alternates: {
    canonical: `${siteUrl()}/`,
  },
};

export default function HomePage() {
  return <LandingMarketing />;
}
