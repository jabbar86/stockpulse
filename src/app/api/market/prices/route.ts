import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  getNseSession,
  getPriceCacheFreshTtlMs,
  getPriceCacheStaleMaxMs,
} from '@/lib/market/nse-session';

// Allow up to 30s on Vercel Hobby plan (default is 10s)
export const maxDuration = 30;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: number;
}

function symbolKey(sym: string): string {
  return sym.replace('.NS', '').replace('.BO', '');
}

// ---------------------------------------------------------------------------
// In-memory price cache — process-local; longer TTL when NSE is closed
// ---------------------------------------------------------------------------
const priceCache = new Map<string, PriceUpdate>();
let cacheUpdatedAt = 0;
let cacheTradingDate = '';

function updatePriceCache(prices: PriceUpdate[], istDateKey: string): void {
  for (const p of prices) {
    priceCache.set(p.symbol, p);
  }
  cacheUpdatedAt = Date.now();
  cacheTradingDate = istDateKey;
}

// Default symbols
const DEFAULT_SYMBOLS = [
  '^NSEI',
  '^BSESN',
  '^NSEBANK',
  'GC=F',
  'SI=F',
  'CL=F',
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
  'INFY.NS',
  'ICICIBANK.NS',
  'HINDUNILVR.NS',
  'SBIN.NS',
  'BHARTIARTL.NS',
  'KOTAKBANK.NS',
  'ITC.NS',
  'LT.NS',
  'AXISBANK.NS',
  'BAJFINANCE.NS',
  'WIPRO.NS',
  'HCLTECH.NS',
  'TATAMOTORS.NS',
  'TATASTEEL.NS',
  'SUNPHARMA.NS',
  'NTPC.NS',
  'MARUTI.NS',
];

async function fetchPrices(symbols: string[]): Promise<PriceUpdate[]> {
  const updates: PriceUpdate[] = [];
  const BATCH = 25;

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result: any = await yahooFinance.quote(symbol);
          if (!result || !result.regularMarketPrice) return null;
          return {
            symbol: symbol.replace('.NS', '').replace('.BO', ''),
            price: result.regularMarketPrice ?? 0,
            change: result.regularMarketChange ?? 0,
            changePercent: result.regularMarketChangePercent ?? 0,
            volume: result.regularMarketVolume ?? undefined,
            timestamp: Date.now(),
          };
        } catch {
          return null;
        }
      })
    );
    updates.push(...(results.filter(Boolean) as PriceUpdate[]));
  }

  return updates;
}

async function resolvePrices(
  requestedSymbols: string[],
  session: ReturnType<typeof getNseSession>
): Promise<{ prices: PriceUpdate[]; source: string }> {
  const today = session.istDateKey;
  if (cacheTradingDate && cacheTradingDate !== today) {
    priceCache.clear();
    cacheUpdatedAt = 0;
    cacheTradingDate = '';
  }

  const keys = requestedSymbols.map(symbolKey);
  const age = Date.now() - cacheUpdatedAt;
  const freshTtl = getPriceCacheFreshTtlMs(session);
  const staleMax = getPriceCacheStaleMaxMs(session);
  const cacheValidFresh = age <= freshTtl;
  const cacheValidClosed = !session.isOpen && staleMax > 0 && age <= staleMax;
  const useCacheLayer = cacheValidFresh || cacheValidClosed;

  const missingSymbols = requestedSymbols.filter((s) => !priceCache.has(symbolKey(s)));

  if (missingSymbols.length === 0 && useCacheLayer && priceCache.size > 0) {
    const list = keys.map((k) => priceCache.get(k)).filter(Boolean) as PriceUpdate[];
    if (list.length === keys.length) {
      return {
        prices: list,
        source: cacheValidFresh ? 'cache' : 'cache-stale',
      };
    }
  }

  if (missingSymbols.length > 0 && useCacheLayer) {
    const haveCount = keys.length - missingSymbols.length;
    const half = keys.length * 0.5;
    if (haveCount >= half || (session.isOpen && haveCount > 0)) {
      const fetched = await fetchPrices(missingSymbols);
      for (const p of fetched) {
        priceCache.set(p.symbol, p);
      }
      cacheUpdatedAt = Date.now();
      cacheTradingDate = today;
      const list = keys.map((k) => priceCache.get(k)).filter(Boolean) as PriceUpdate[];
      if (list.length === keys.length) {
        return {
          prices: list,
          source: haveCount > 0 ? 'cache+live' : 'live',
        };
      }
    }
  }

  const all = await fetchPrices(requestedSymbols);
  updatePriceCache(all, today);
  return { prices: all, source: 'live' };
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols');
  const requestedSymbols = symbolsParam
    ? symbolsParam.split(',').map((s) => {
        const trimmed = s.trim().toUpperCase();
        if (
          trimmed.endsWith('.NS') ||
          trimmed.endsWith('.BO') ||
          trimmed.startsWith('^') ||
          trimmed.includes('=')
        ) {
          return trimmed;
        }
        return `${trimmed}.NS`;
      })
    : DEFAULT_SYMBOLS;

  const session = getNseSession();

  try {
    const { prices, source } = await resolvePrices(requestedSymbols, session);

    const message = session.isOpen
      ? undefined
      : session.isWeekend
        ? 'Market closed — weekend'
        : session.isHoliday
          ? 'Market closed — holiday'
          : 'Market closed — after hours';

    const res = NextResponse.json({
      prices,
      marketStatus: {
        isOpen: session.isOpen,
        isWeekend: session.isWeekend,
        isHoliday: session.isHoliday,
        message,
      },
      source,
      timestamp: Date.now(),
    });

    // When NSE is shut, allow short browser/CDN caching per URL (same quotes for everyone)
    if (!session.isOpen) {
      const maxAge = Math.floor(getPriceCacheFreshTtlMs(session) / 1000);
      res.headers.set(
        'Cache-Control',
        `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`
      );
    }

    return res;
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch prices', marketStatus: session },
      { status: 500 }
    );
  }
}
