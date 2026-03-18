import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

// Allow up to 30s on Vercel Hobby plan (default is 10s)
export const maxDuration = 30;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// NSE holidays (MM-DD)
const NSE_HOLIDAYS = new Set([
  '01-26', '02-26', '03-14', '03-31', '04-10', '04-14', '04-18',
  '05-01', '06-27', '08-15', '08-16', '08-27', '10-02', '10-20',
  '10-21', '10-22', '11-05', '11-26', '12-25',
]);

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: number;
}

function getISTParts(): { year: number; month: number; day: number; hour: number; minute: number } {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

function getMarketStatus() {
  const ist = getISTParts();
  const dayOfWeek = new Date(Date.UTC(ist.year, ist.month - 1, ist.day)).getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const mmdd = `${String(ist.month).padStart(2, '0')}-${String(ist.day).padStart(2, '0')}`;
  const isHoliday = NSE_HOLIDAYS.has(mmdd);

  if (isWeekend || isHoliday) {
    return { isOpen: false, isWeekend, isHoliday };
  }

  const mins = ist.hour * 60 + ist.minute;
  const isOpen = mins >= 555 && mins <= 930; // 9:15 AM - 3:30 PM IST

  return { isOpen, isWeekend, isHoliday };
}

// ---------------------------------------------------------------------------
// In-memory price cache — avoids hammering Yahoo on every poll
// ---------------------------------------------------------------------------
const priceCache = new Map<string, PriceUpdate>();
let cacheUpdatedAt = 0;
let cacheTradingDate = '';

function getISTDateString(): string {
  const ist = getISTParts();
  return `${ist.year}-${String(ist.month).padStart(2, '0')}-${String(ist.day).padStart(2, '0')}`;
}

// TTLs: 15s during market hours, 5 min after hours
function getCacheTTL(isOpen: boolean): number {
  return isOpen ? 15_000 : 300_000;
}

function getCachedPrices(symbols: string[], isOpen: boolean): PriceUpdate[] | null {
  // Invalidate stale cache from previous trading day
  const today = getISTDateString();
  if (cacheTradingDate && cacheTradingDate !== today) {
    priceCache.clear();
    cacheUpdatedAt = 0;
    cacheTradingDate = '';
  }

  if (priceCache.size === 0) return null;
  if (Date.now() - cacheUpdatedAt > getCacheTTL(isOpen)) return null;

  const results: PriceUpdate[] = [];
  for (const sym of symbols) {
    const key = sym.replace('.NS', '').replace('.BO', '');
    const cached = priceCache.get(key);
    if (cached) results.push(cached);
  }
  // Only use cache if we have at least half the requested symbols
  return results.length >= symbols.length * 0.5 ? results : null;
}

function updatePriceCache(prices: PriceUpdate[]): void {
  for (const p of prices) {
    priceCache.set(p.symbol, p);
  }
  cacheUpdatedAt = Date.now();
  cacheTradingDate = getISTDateString();
}

// Default symbols
const DEFAULT_SYMBOLS = [
  '^NSEI', '^BSESN', '^NSEBANK',
  'GC=F', 'SI=F', 'CL=F',
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'ITC.NS',
  'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'WIPRO.NS', 'HCLTECH.NS',
  'TATAMOTORS.NS', 'TATASTEEL.NS', 'SUNPHARMA.NS', 'NTPC.NS', 'MARUTI.NS',
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

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols');
  const requestedSymbols = symbolsParam
    ? symbolsParam.split(',').map((s) => {
        const trimmed = s.trim().toUpperCase();
        if (trimmed.endsWith('.NS') || trimmed.endsWith('.BO') || trimmed.startsWith('^') || trimmed.includes('=')) {
          return trimmed;
        }
        return `${trimmed}.NS`;
      })
    : DEFAULT_SYMBOLS;

  const market = getMarketStatus();

  try {
    // Serve from cache if fresh enough
    const cached = getCachedPrices(requestedSymbols, market.isOpen);
    const prices = cached ?? await fetchPrices(requestedSymbols);

    if (!cached) {
      updatePriceCache(prices);
    }

    const message = market.isOpen
      ? undefined
      : market.isWeekend
      ? 'Market closed — weekend'
      : market.isHoliday
      ? 'Market closed — holiday'
      : 'Market closed — after hours';

    return NextResponse.json({
      prices,
      marketStatus: {
        isOpen: market.isOpen,
        isWeekend: market.isWeekend,
        isHoliday: market.isHoliday,
        message,
      },
      source: cached ? 'cache' : 'live',
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch prices', marketStatus: market },
      { status: 500 }
    );
  }
}
