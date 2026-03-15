import yahooFinance from 'yahoo-finance2';
import type { StockQuote, HistoricalDataPoint } from '@/types';

type Period = '1mo' | '3mo' | '6mo' | '1y' | '5y';

function formatYahooSymbol(symbol: string): string {
  const trimmed = symbol.trim().toUpperCase();
  if (trimmed.endsWith('.NS') || trimmed.endsWith('.BO')) {
    return trimmed;
  }
  return `${trimmed}.NS`;
}

function periodToInterval(period: Period): '1d' | '1wk' | '1mo' {
  switch (period) {
    case '1mo':
    case '3mo':
    case '6mo':
      return '1d';
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
      return new Date(now.setMonth(now.getMonth() - 3));
  }
}

export async function getQuote(symbol: string): Promise<StockQuote> {
  try {
    const yahooSymbol = formatYahooSymbol(symbol);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(yahooSymbol);

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
      dividendYield: result.dividendYield
        ? result.dividendYield * 100
        : undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch quote for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getHistoricalData(
  symbol: string,
  period: Period = '3mo'
): Promise<HistoricalDataPoint[]> {
  try {
    const yahooSymbol = formatYahooSymbol(symbol);
    const startDate = periodToStartDate(period);
    const interval = periodToInterval(period);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = await yahooFinance.historical(yahooSymbol, {
      period1: startDate,
      interval,
    });

    return result.map((row: any) => ({
      date: row.date.toISOString().split('T')[0],
      open: row.open ?? 0,
      high: row.high ?? 0,
      low: row.low ?? 0,
      close: row.close ?? 0,
      volume: row.volume ?? 0,
    }));
  } catch (error) {
    throw new Error(
      `Failed to fetch historical data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function searchStocks(
  query: string
): Promise<{ symbol: string; name: string; exchange: string }[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    return (result.quotes || [])
      .filter(
        (q: any) =>
          q.symbol &&
          typeof q.symbol === 'string' &&
          (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'))
      )
      .map((q: any) => ({
        symbol: q.symbol.replace(/\.(NS|BO)$/, ''),
        name: q.shortname || q.longname || q.symbol,
        exchange: q.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
      }));
  } catch (error) {
    throw new Error(
      `Failed to search stocks for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
