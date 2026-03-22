import type { Metadata } from 'next';
import { siteUrl } from '@/lib/seo/site-config';

const base = siteUrl();

export const metadata: Metadata = {
  title: 'Create account',
  description:
    'Create a free StockPulse account for AI stock analysis, Indian market data, and portfolio tracking on NSE & BSE.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${base}/register` },
  openGraph: {
    title: 'Get started | StockPulse',
    description: 'Join StockPulse — real-time Indian markets, technicals, and broker integrations.',
    url: '/register',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
