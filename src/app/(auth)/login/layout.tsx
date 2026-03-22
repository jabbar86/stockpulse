import type { Metadata } from 'next';
import { siteUrl } from '@/lib/seo/site-config';

const base = siteUrl();

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to StockPulse to track your Indian stock portfolio, view AI analysis, and connect your broker.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${base}/login` },
  openGraph: {
    title: 'Sign in | StockPulse',
    description: 'Access your StockPulse dashboard for NSE & BSE portfolio tracking.',
    url: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
