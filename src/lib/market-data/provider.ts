import YahooFinance from 'yahoo-finance2';
import type { StockQuote, HistoricalDataPoint } from '@/types';
import { getUpstoxQuote } from '@/lib/market-data/upstox-provider';
import { getAngelOneQuote, isAngelOneConfigured } from '@/lib/market-data/angelone-provider';
import { getFyersQuote, isFyersConfigured } from '@/lib/market-data/fyers-provider';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

type Period = '1d_1m' | '1d_5m' | '1d_1h' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y';

// ---------------------------------------------------------------------------
// Symbol helpers
// ---------------------------------------------------------------------------

// Cache: symbol -> resolved Yahoo symbol (e.g. NITINCAST -> NITINCAST.BO)
const resolvedSymbolCache = new Map<string, string>();

/**
 * Resolve a symbol to its Yahoo Finance ticker.
 * If exchange is known, use it directly. Otherwise, try .NS first, then .BO.
 */
async function resolveYahooSymbol(symbol: string, exchange?: string): Promise<string> {
  const trimmed = symbol.trim().toUpperCase();
  if (trimmed.endsWith('.NS') || trimmed.endsWith('.BO')) return trimmed;
  if (exchange?.toUpperCase() === 'BSE') return `${trimmed}.BO`;
  if (exchange?.toUpperCase() === 'NSE') return `${trimmed}.NS`;

  // Check cache
  if (resolvedSymbolCache.has(trimmed)) return resolvedSymbolCache.get(trimmed)!;

  // Try NSE first
  const nsSymbol = `${trimmed}.NS`;
  try {
    const result = await yahooFinance.quote(nsSymbol);
    if (result) {
      resolvedSymbolCache.set(trimmed, nsSymbol);
      return nsSymbol;
    }
  } catch { /* not on NSE */ }

  // Try BSE
  const boSymbol = `${trimmed}.BO`;
  try {
    const result = await yahooFinance.quote(boSymbol);
    if (result) {
      resolvedSymbolCache.set(trimmed, boSymbol);
      return boSymbol;
    }
  } catch { /* not on BSE either */ }

  // Default to NSE if both fail
  return nsSymbol;
}

function formatYahooSymbol(symbol: string, exchange?: string): string {
  const trimmed = symbol.trim().toUpperCase();
  if (trimmed.endsWith('.NS') || trimmed.endsWith('.BO')) {
    return trimmed;
  }
  const suffix = exchange?.toUpperCase() === 'BSE' ? '.BO' : '.NS';
  return `${trimmed}${suffix}`;
}

function periodToInterval(period: Period): '1m' | '5m' | '1h' | '1d' | '1wk' {
  switch (period) {
    case '1d_1m':
      return '1m';
    case '1d_5m':
      return '5m';
    case '1d_1h':
      return '1h';
    case '5d':
      return '5m';
    case '1mo':
    case '3mo':
    case '6mo':
    case '1y':
      return '1d';
    case '5y':
      return '1wk';
    default:
      return '1d';
  }
}

function periodToStartDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case '1d_1m':
    case '1d_5m':
    case '1d_1h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    case '5d':
      return new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    case '1mo':
      return new Date(now.setMonth(now.getMonth() - 1));
    case '3mo':
      return new Date(now.setMonth(now.getMonth() - 3));
    case '6mo':
      return new Date(now.setMonth(now.getMonth() - 6));
    case '1y':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    case '5y':
      return new Date(now.setFullYear(now.getFullYear() - 5));
    default:
      return new Date(now.setMonth(now.getMonth() - 1));
  }
}

// ---------------------------------------------------------------------------
// Multi-provider quote with fallback
// ---------------------------------------------------------------------------

type ProviderName = 'upstox' | 'angelone' | 'fyers' | 'yahoo';

interface ProviderAttempt {
  name: ProviderName;
  fn: () => Promise<StockQuote>;
}

/**
 * Get a stock quote with automatic fallback across providers.
 * Order: Upstox (if token) -> Angel One (if configured) -> FYERS (if configured) -> Yahoo Finance
 */
export async function getQuote(
  symbol: string,
  upstoxToken?: string | null,
  exchange?: string
): Promise<StockQuote> {
  const providers: ProviderAttempt[] = [];

  // 1. Upstox (requires per-user OAuth token)
  if (upstoxToken) {
    providers.push({
      name: 'upstox',
      fn: () => getUpstoxQuote(symbol, upstoxToken),
    });
  }

  // 2. Angel One (server-level credentials)
  if (isAngelOneConfigured()) {
    providers.push({
      name: 'angelone',
      fn: () => getAngelOneQuote(symbol),
    });
  }

  // 3. FYERS (server-level credentials)
  if (isFyersConfigured()) {
    providers.push({
      name: 'fyers',
      fn: () => getFyersQuote(symbol),
    });
  }

  // 4. Yahoo Finance (always available, delayed)
  providers.push({
    name: 'yahoo',
    fn: () => getYahooQuote(symbol, exchange),
  });

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const quote = await provider.fn();
      return quote;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[${provider.name}] Quote failed for ${symbol}: ${lastError.message}`);
    }
  }

  throw lastError || new Error(`All providers failed for ${symbol}`);
}

/**
 * Yahoo Finance quote (internal — final fallback)
 */
async function getYahooQuote(symbol: string, exchange?: string): Promise<StockQuote> {
  // If exchange is known, use it directly; otherwise resolve (.NS or .BO)
  const yahooSymbol = exchange
    ? formatYahooSymbol(symbol, exchange)
    : await resolveYahooSymbol(symbol);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await yahooFinance.quote(yahooSymbol);

  if (!result) {
    throw new Error(`Yahoo returned no data for ${symbol}`);
  }

  return {
    symbol: symbol.toUpperCase(),
    name: result.shortName || result.longName || symbol,
    price: result.regularMarketPrice ?? 0,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
    previousClose: result.regularMarketPreviousClose ?? 0,
    open: result.regularMarketOpen ?? 0,
    dayHigh: result.regularMarketDayHigh ?? 0,
    dayLow: result.regularMarketDayLow ?? 0,
    volume: result.regularMarketVolume ?? 0,
    marketCap: result.marketCap ?? undefined,
    fiftyTwoWeekHigh: result.fiftyTwoWeekHigh ?? undefined,
    fiftyTwoWeekLow: result.fiftyTwoWeekLow ?? undefined,
    pe: result.trailingPE ?? undefined,
    eps: result.epsTrailingTwelveMonths ?? undefined,
    dividendYield: result.dividendYield ? result.dividendYield * 100 : undefined,
  };
}

// Backward compat
export async function getQuoteWithUpstox(
  symbol: string,
  upstoxToken?: string | null,
  exchange?: string
): Promise<StockQuote> {
  return getQuote(symbol, upstoxToken, exchange);
}

// ---------------------------------------------------------------------------
// Historical data (Yahoo only — brokers don't provide free historical)
// ---------------------------------------------------------------------------

// In-memory cache for historical data: "SYMBOL:period" -> { data, fetchedAt }
const historicalCache = new Map<string, { data: HistoricalDataPoint[]; fetchedAt: number }>();

// Cache TTL: intraday 2 min, daily 10 min
function getHistoricalCacheTtl(period: Period): number {
  if (['1d_1m', '1d_5m', '1d_1h', '5d'].includes(period)) return 2 * 60 * 1000;
  return 10 * 60 * 1000;
}

export async function getHistoricalData(
  symbol: string,
  period: Period = '3mo',
  exchange?: string
): Promise<HistoricalDataPoint[]> {
  const cacheKey = `${symbol.toUpperCase()}:${period}:${exchange || ''}`;
  const ttl = getHistoricalCacheTtl(period);
  const cached = historicalCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ttl) {
    return cached.data;
  }

  try {
    const yahooSymbol = exchange
      ? formatYahooSymbol(symbol, exchange)
      : await resolveYahooSymbol(symbol);
    const startDate = periodToStartDate(period);
    const endDate = new Date();
    const interval = periodToInterval(period);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.chart(yahooSymbol, {
      period1: startDate,
      period2: endDate,
      interval,
    });

    const isIntraday = ['1d_1m', '1d_5m', '1d_1h', '5d'].includes(period);
    const quotes = result?.quotes || [];
    const seen = new Set<string>();
    const data = quotes
      .filter((row: any) => row.date)
      .map((row: any) => {
        const d = new Date(row.date);
        const dateStr = isIntraday ? d.toISOString() : d.toISOString().split('T')[0];
        return {
          date: dateStr,
          open: row.open ?? 0,
          high: row.high ?? 0,
          low: row.low ?? 0,
          close: row.close ?? 0,
          volume: row.volume ?? 0,
        };
      })
      .filter((row: HistoricalDataPoint) => {
        if (seen.has(row.date)) return false;
        seen.add(row.date);
        return true;
      });

    historicalCache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;
  } catch (error) {
    throw new Error(
      `Failed to fetch historical data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ---------------------------------------------------------------------------
// Search (Yahoo + local indices/commodities)
// ---------------------------------------------------------------------------

const KNOWN_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50', exchange: 'NSE' },
  { symbol: '^BSESN', name: 'SENSEX', exchange: 'BSE' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY', exchange: 'NSE' },
  { symbol: '^CNXIT', name: 'NIFTY IT', exchange: 'NSE' },
  { symbol: '^CNXPHARMA', name: 'NIFTY PHARMA', exchange: 'NSE' },
  { symbol: 'NIFTY_FIN_SERVICE.NS', name: 'NIFTY FIN SERVICE', exchange: 'NSE' },
];

const KNOWN_COMMODITIES = [
  { symbol: 'GC=F', name: 'Gold Futures', exchange: 'COMEX' },
  { symbol: 'SI=F', name: 'Silver Futures', exchange: 'COMEX' },
  { symbol: 'CL=F', name: 'Crude Oil WTI', exchange: 'NYMEX' },
  { symbol: 'NG=F', name: 'Natural Gas', exchange: 'NYMEX' },
  { symbol: 'HG=F', name: 'Copper Futures', exchange: 'COMEX' },
];

export async function searchStocks(
  query: string
): Promise<{ symbol: string; name: string; exchange: string }[]> {
  try {
    const q = query.toLowerCase();

    const matchedIndices = KNOWN_INDICES.filter(
      (idx) =>
        idx.name.toLowerCase().includes(q) ||
        idx.symbol.toLowerCase().includes(q)
    ).map((idx) => ({
      symbol: idx.symbol,
      name: idx.name,
      exchange: idx.exchange,
    }));

    const matchedCommodities = KNOWN_COMMODITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    ).map((c) => ({
      symbol: c.symbol,
      name: c.name,
      exchange: c.exchange,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(query, {
      quotesCount: 15,
      newsCount: 0,
    });

    const stocks = (result.quotes || [])
      .filter(
        (item: any) =>
          item.symbol &&
          typeof item.symbol === 'string' &&
          (item.symbol.endsWith('.NS') || item.symbol.endsWith('.BO'))
      )
      .map((item: any) => ({
        symbol: item.symbol.replace(/\.(NS|BO)$/, ''),
        name: item.shortname || item.longname || item.symbol,
        exchange: item.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
      }));

    return [...matchedIndices, ...matchedCommodities, ...stocks];
  } catch (error) {
    throw new Error(
      `Failed to search stocks for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ---------------------------------------------------------------------------
// Provider status (for UI/settings display)
// ---------------------------------------------------------------------------

export function getActiveProviders(): { name: ProviderName; status: 'active' | 'not_configured' }[] {
  return [
    { name: 'upstox', status: process.env.UPSTOX_API_KEY ? 'active' : 'not_configured' },
    { name: 'angelone', status: isAngelOneConfigured() ? 'active' : 'not_configured' },
    { name: 'fyers', status: isFyersConfigured() ? 'active' : 'not_configured' },
    { name: 'yahoo', status: 'active' },
  ];
}
