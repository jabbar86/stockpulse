import type { Metadata } from 'next';
import Link from 'next/link';
import { siteUrl, SITE_NAME } from '@/lib/seo/site-config';
import { SCREENERS } from '@/lib/seo/public-pages';
import { PublicShell } from '@/components/seo/public-shell';

const canonical = `${siteUrl()}/stock-screener`;
const title = 'Free Stock Screener for Nifty 100 — Technical Scans';
const description =
  'Free technical stock screens for Nifty 100: oversold and overbought RSI, 52-week highs and lows, 200 DMA, golden cross, MACD crossover and volume spikes.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { type: 'website', locale: 'en_IN', url: canonical, title, description, siteName: SITE_NAME },
};

export default function StockScreenerIndexPage() {
  return (
    <PublicShell>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stock screener</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCREENERS.map((s) => (
          <li key={s.slug}>
            <Link href={`/stock-screener/${s.slug}`} className="block h-full rounded-lg border border-border p-5 hover:bg-muted">
              <h2 className="font-semibold">{s.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PublicShell>
  );
}
