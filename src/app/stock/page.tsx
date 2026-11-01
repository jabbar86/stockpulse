import type { Metadata } from 'next';
import Link from 'next/link';
import { NIFTY_50, NIFTY_NEXT_50 } from '@/lib/market-data/universe';
import { siteUrl, SITE_NAME } from '@/lib/seo/site-config';
import { stockPath } from '@/lib/seo/public-pages';
import { PublicShell } from '@/components/seo/public-shell';

const canonical = `${siteUrl()}/stock`;
const title = 'Nifty 50 & Nifty 100 Stocks — Share Prices & Technical Analysis';
const description =
  'Share prices, 52-week ranges, P/E, market cap and technical indicators (RSI, MACD, moving averages) for every Nifty 50 and Nifty 100 stock on NSE.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { type: 'website', locale: 'en_IN', url: canonical, title, description, siteName: SITE_NAME },
};

function SymbolGrid({ symbols }: { symbols: readonly string[] }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {symbols.map((s) => (
        <li key={s}>
          <Link
            href={stockPath(s)}
            className="block rounded-md border border-border px-3 py-2 font-mono text-sm hover:bg-muted"
          >
            {s}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function StockIndexPage() {
  return (
    <PublicShell>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Indian stocks: prices & analysis</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Nifty 50 stocks</h2>
        <SymbolGrid symbols={NIFTY_50} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Nifty Next 50 (Nifty 100) stocks</h2>
        <SymbolGrid symbols={NIFTY_NEXT_50} />
      </section>
    </PublicShell>
  );
}
