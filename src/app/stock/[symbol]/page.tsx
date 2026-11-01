import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getQuote, getHistoricalData } from '@/lib/market-data/provider';
import { calculateTechnicalIndicators } from '@/lib/analysis/technical';
import type { HistoricalDataPoint, StockQuote, TechnicalIndicators } from '@/types';
import { siteUrl, SITE_NAME } from '@/lib/seo/site-config';
import {
  PUBLIC_STOCK_SYMBOLS,
  isNifty50,
  isPublicStock,
  stockPath,
  symbolFromParam,
} from '@/lib/seo/public-pages';
import { PublicShell, JsonLd } from '@/components/seo/public-shell';

/** Rebuild each stock page at most hourly (delayed data is fine for search snippets). */
export const revalidate = 3600;
/** Pages are generated on first request, then cached — avoids hammering the data provider at build time. */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ symbol: string }> };

type StockSnapshot = {
  quote: StockQuote;
  history: HistoricalDataPoint[];
  technical: TechnicalIndicators | null;
  oneYearReturn: number | null;
};

/**
 * After a provider failure, skip refetching that symbol for a while so crawler retries
 * of a not-yet-cached page don't keep hitting the data provider.
 */
const FAILURE_BACKOFF_MS = 5 * 60 * 1000;
const recentFailures = new Map<string, number>();

/** Shared between generateMetadata and the page within one render. */
const loadSnapshot = cache(async (symbol: string): Promise<StockSnapshot | null> => {
  const failedAt = recentFailures.get(symbol);
  if (failedAt && Date.now() - failedAt < FAILURE_BACKOFF_MS) return null;
  try {
    const [quote, history] = await Promise.all([
      getQuote(symbol, null, 'NSE'),
      getHistoricalData(symbol, '1y', 'NSE').catch(() => [] as HistoricalDataPoint[]),
    ]);
    if (!quote.price) {
      recentFailures.set(symbol, Date.now());
      return null;
    }
    const technical = history.length >= 30 ? calculateTechnicalIndicators(history) : null;
    const first = history.find((d) => d.close > 0)?.close;
    const oneYearReturn = first ? ((quote.price - first) / first) * 100 : null;
    return { quote, history, technical, oneYearReturn };
  } catch (error) {
    console.warn(`[public stock page] ${symbol}:`, error);
    recentFailures.set(symbol, Date.now());
    return null;
  }
});

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function formatCrore(value?: number): string {
  if (!value) return '—';
  return `₹${num.format(value / 1e7)} Cr`;
}

function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

const BIAS_LABEL: Record<TechnicalIndicators['overallSignal'], string> = {
  strong_buy: 'Strongly bullish',
  buy: 'Bullish',
  neutral: 'Neutral',
  sell: 'Bearish',
  strong_sell: 'Strongly bearish',
};

function describeStock(symbol: string, s: StockSnapshot): string {
  const { quote, technical, oneYearReturn } = s;
  const parts = [
    `${quote.name} (NSE: ${symbol}) last traded at ${inr.format(quote.price)}, ${quote.change >= 0 ? 'up' : 'down'} ${Math.abs(quote.changePercent).toFixed(2)}% on the day.`,
  ];
  if (oneYearReturn !== null) {
    parts.push(`Over the past year the stock has ${oneYearReturn >= 0 ? 'gained' : 'lost'} ${Math.abs(oneYearReturn).toFixed(1)}%.`);
  }
  if (quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow) {
    const offHigh = ((quote.fiftyTwoWeekHigh - quote.price) / quote.fiftyTwoWeekHigh) * 100;
    parts.push(
      `Its 52-week range is ${inr.format(quote.fiftyTwoWeekLow)} – ${inr.format(quote.fiftyTwoWeekHigh)}, and it trades ${offHigh.toFixed(1)}% below the 52-week high.`
    );
  }
  if (quote.pe) parts.push(`The trailing P/E ratio is ${quote.pe.toFixed(1)}.`);
  if (technical) {
    const vs200 = technical.sma.sma200 ? (quote.price >= technical.sma.sma200 ? 'above' : 'below') : null;
    parts.push(
      `On daily charts RSI(14) is ${technical.rsi.value.toFixed(0)} (${technical.rsi.signal}), MACD is ${technical.macd.trend}` +
        (vs200 ? ` and the price is ${vs200} its 200-day moving average.` : '.')
    );
  }
  return parts.join(' ');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const symbol = symbolFromParam((await params).symbol);
  if (!isPublicStock(symbol)) return {};
  const snapshot = await loadSnapshot(symbol);
  const name = snapshot?.quote.name ?? symbol;
  const canonical = `${siteUrl()}${stockPath(symbol)}`;
  const title = `${name} Share Price Today, Analysis & Technicals (NSE: ${symbol})`;
  const description = snapshot
    ? `${name} share price ${inr.format(snapshot.quote.price)} (${formatPct(snapshot.quote.changePercent)}). 52-week range, P/E, market cap, RSI, MACD and moving averages for ${symbol}.`
    : `${name} (NSE: ${symbol}) share price, 52-week range, P/E, market cap and technical analysis.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', locale: 'en_IN', url: canonical, title, description, siteName: SITE_NAME },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function PriceSparkline({ history }: { history: HistoricalDataPoint[] }) {
  const closes = history.map((d) => d.close).filter((c) => c > 0);
  if (closes.length < 2) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const w = 600;
  const h = 120;
  const points = closes
    .map((c, i) => `${((i / (closes.length - 1)) * w).toFixed(1)},${(h - ((c - min) / (max - min || 1)) * h).toFixed(1)}`)
    .join(' ');
  const up = closes[closes.length - 1] >= closes[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full" preserveAspectRatio="none" role="img" aria-label="1-year price chart">
      <polyline
        points={points}
        fill="none"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className={up ? 'stroke-emerald-500' : 'stroke-red-500'}
      />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-semibold">{value}</dd>
    </div>
  );
}

export default async function PublicStockPage({ params }: Props) {
  const symbol = symbolFromParam((await params).symbol);
  if (!isPublicStock(symbol)) notFound();

  const snapshot = await loadSnapshot(symbol);
  if (!snapshot) {
    // Throwing (rather than notFound) keeps the last good ISR page instead of caching a 404.
    throw new Error(`Market data unavailable for ${symbol}`);
  }

  const { quote, history, technical, oneYearReturn } = snapshot;
  const base = siteUrl();
  const url = `${base}${stockPath(symbol)}`;
  const summary = describeStock(symbol, snapshot);
  const up = quote.change >= 0;

  const idx = PUBLIC_STOCK_SYMBOLS.indexOf(symbol);
  const related = Array.from({ length: 8 }, (_, i) => PUBLIC_STOCK_SYMBOLS[(idx + i + 1) % PUBLIC_STOCK_SYMBOLS.length]);

  const faqs = [
    {
      q: `What is the share price of ${quote.name} today?`,
      a: `${quote.name} (${symbol}) is trading at ${inr.format(quote.price)} on NSE, ${formatPct(quote.changePercent)} from the previous close of ${inr.format(quote.previousClose)}. Prices may be delayed.`,
    },
    ...(quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow
      ? [
          {
            q: `What is the 52-week high and low of ${symbol}?`,
            a: `The 52-week high is ${inr.format(quote.fiftyTwoWeekHigh)} and the 52-week low is ${inr.format(quote.fiftyTwoWeekLow)}.`,
          },
        ]
      : []),
    ...(quote.pe
      ? [{ q: `What is the P/E ratio of ${quote.name}?`, a: `The trailing twelve-month P/E ratio of ${symbol} is ${quote.pe.toFixed(1)}.` }]
      : []),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: 'Stocks', item: `${base}/stock` },
          { '@type': 'ListItem', position: 3, name: quote.name, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> /{' '}
        <Link href="/stock" className="hover:text-foreground">Stocks</Link> / <span>{symbol}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{quote.name} Share Price</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            NSE: {symbol}
            {isNifty50(symbol) ? ' · Nifty 50 constituent' : ' · Nifty 100 constituent'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-bold">{inr.format(quote.price)}</p>
          <p className={`font-mono text-sm font-medium ${up ? 'text-emerald-600' : 'text-red-600'}`}>
            {up ? '+' : ''}
            {num.format(quote.change)} ({formatPct(quote.changePercent)})
          </p>
        </div>
      </header>

      <section className="mt-6 rounded-lg border border-border p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>1-year price</span>
          {oneYearReturn !== null && <span className="font-mono">{formatPct(oneYearReturn)}</span>}
        </div>
        <PriceSparkline history={history} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{symbol} key statistics</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Previous close" value={inr.format(quote.previousClose)} />
          <Stat label="Open" value={inr.format(quote.open)} />
          <Stat label="Day range" value={`${num.format(quote.dayLow)} – ${num.format(quote.dayHigh)}`} />
          <Stat
            label="52-week range"
            value={quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh ? `${num.format(quote.fiftyTwoWeekLow)} – ${num.format(quote.fiftyTwoWeekHigh)}` : '—'}
          />
          <Stat label="Market cap" value={formatCrore(quote.marketCap)} />
          <Stat label="P/E (TTM)" value={quote.pe ? quote.pe.toFixed(2) : '—'} />
          <Stat label="EPS (TTM)" value={quote.eps ? inr.format(quote.eps) : '—'} />
          <Stat label="Dividend yield" value={quote.dividendYield ? `${quote.dividendYield.toFixed(2)}%` : '—'} />
        </dl>
      </section>

      {technical && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{symbol} technical analysis</h2>
          <p className="mt-1 text-xs text-muted-foreground">Daily timeframe. Indicator readings, not a recommendation.</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Technical bias" value={BIAS_LABEL[technical.overallSignal]} />
            <Stat label="RSI (14)" value={`${technical.rsi.value.toFixed(1)} · ${technical.rsi.signal}`} />
            <Stat label="MACD trend" value={technical.macd.trend} />
            <Stat label="Bollinger position" value={technical.bollingerBands.position} />
            <Stat label="SMA 20" value={technical.sma.sma20 ? num.format(technical.sma.sma20) : '—'} />
            <Stat label="SMA 50" value={technical.sma.sma50 ? num.format(technical.sma.sma50) : '—'} />
            <Stat label="SMA 200" value={technical.sma.sma200 ? num.format(technical.sma.sma200) : '—'} />
            <Stat label="EMA 12 / 26" value={`${num.format(technical.ema.ema12)} / ${num.format(technical.ema.ema26)}`} />
          </dl>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">About {quote.name} stock</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{summary}</p>
      </section>

      <section className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-5">
        <h2 className="text-base font-semibold">Get AI analysis, live charts and alerts for {symbol}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive candlestick charts, AI-generated research, price alerts and portfolio tracking. Free to start.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(`/stocks/${symbol}`)}`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Analyse {symbol} free
          </Link>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/stocks/${symbol}`)}`}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Frequently asked questions</h2>
        <div className="mt-3 space-y-4">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Related stocks</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {related.map((s) => (
            <li key={s}>
              <Link href={stockPath(s)} className="inline-block rounded-md border border-border px-3 py-1.5 font-mono text-xs hover:bg-muted">
                {s}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Data may be delayed. Page updated {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST.
      </p>
    </PublicShell>
  );
}
