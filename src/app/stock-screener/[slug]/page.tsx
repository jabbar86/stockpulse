import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { applyFilters, type ScreenerSnapshot } from '@/lib/screener/filters';
import { getPublicNifty100Snapshots } from '@/lib/screener/public-snapshots';
import { siteUrl, SITE_NAME } from '@/lib/seo/site-config';
import { SCREENERS, getScreener, stockPath } from '@/lib/seo/public-pages';
import { PublicShell, JsonLd } from '@/components/seo/public-shell';

/** Page HTML is rebuilt at most hourly; the underlying snapshots refresh every 3 hours. */
export const revalidate = 3600;
export const maxDuration = 60;
/** Rendered on first request rather than at build, so builds don't depend on the data provider. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const screener = getScreener((await params).slug);
  if (!screener) return {};
  const canonical = `${siteUrl()}/stock-screener/${screener.slug}`;
  return {
    title: screener.title,
    description: screener.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      url: canonical,
      title: screener.title,
      description: screener.description,
      siteName: SITE_NAME,
    },
    twitter: { card: 'summary_large_image', title: screener.title, description: screener.description },
  };
}

const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function pct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function ResultsTable({ rows }: { rows: ScreenerSnapshot[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Stock</th>
            <th className="px-3 py-2 text-right font-medium">Price (₹)</th>
            <th className="px-3 py-2 text-right font-medium">Day change</th>
            <th className="px-3 py-2 text-right font-medium">RSI (14)</th>
            <th className="px-3 py-2 text-right font-medium">vs 200 DMA</th>
            <th className="px-3 py-2 text-right font-medium">From 52W high</th>
            <th className="px-3 py-2 text-right font-medium">Volume vs avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.symbol} className="border-t border-border">
              <td className="px-3 py-2">
                <Link href={stockPath(s.symbol)} className="font-mono font-medium text-primary hover:underline">
                  {s.symbol}
                </Link>
              </td>
              <td className="px-3 py-2 text-right font-mono">{num.format(s.price)}</td>
              <td className={`px-3 py-2 text-right font-mono ${s.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {pct(s.changePercent)}
              </td>
              <td className="px-3 py-2 text-right font-mono">{s.rsi14 !== null ? s.rsi14.toFixed(1) : '—'}</td>
              <td className="px-3 py-2 text-right font-mono">{pct(s.sma200 ? ((s.price - s.sma200) / s.sma200) * 100 : null)}</td>
              <td className="px-3 py-2 text-right font-mono">{pct(s.high52w > 0 ? ((s.price - s.high52w) / s.high52w) * 100 : null)}</td>
              <td className="px-3 py-2 text-right font-mono">{s.volumeRatio !== null ? `${s.volumeRatio.toFixed(2)}×` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ScreenerPresetPage({ params }: Props) {
  const screener = getScreener((await params).slug);
  if (!screener) notFound();

  const { snapshots, generatedAt } = await getPublicNifty100Snapshots();
  const matches = applyFilters(snapshots, screener.filters).sort(screener.sort);

  const base = siteUrl();
  const url = `${base}/stock-screener/${screener.slug}`;
  const updated = new Date(generatedAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: 'Stock screener', item: `${base}/stock-screener` },
          { '@type': 'ListItem', position: 3, name: screener.name, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        name: screener.name,
        numberOfItems: matches.length,
        itemListElement: matches.slice(0, 50).map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${base}${stockPath(s.symbol)}`,
          name: s.symbol,
        })),
      },
    ],
  };

  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> /{' '}
        <Link href="/stock-screener" className="hover:text-foreground">Stock screener</Link> / <span>{screener.name}</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{screener.name}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{screener.intro}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        {matches.length} of {snapshots.length} Nifty 100 stocks match · Daily candles · Updated {updated} IST
      </p>

      <section className="mt-6">
        {matches.length > 0 ? (
          <ResultsTable rows={matches} />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No Nifty 100 stocks match this screen right now. Check back after the next update or try another screen below.
          </div>
        )}
      </section>

      <section className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-5">
        <h2 className="text-base font-semibold">Build your own screen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Combine RSI, moving averages, MACD, 52-week levels and volume filters, then set price alerts on the results.
        </p>
        <Link
          href={`/register?callbackUrl=${encodeURIComponent('/screener')}`}
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open the full screener free
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">More stock screens</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {SCREENERS.filter((s) => s.slug !== screener.slug).map((s) => (
            <li key={s.slug}>
              <Link href={`/stock-screener/${s.slug}`} className="inline-block rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Technical screens are for research and education only. They are not recommendations to buy or sell.
      </p>
    </PublicShell>
  );
}
