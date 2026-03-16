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

function getMarketStatus() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);

  const day = ist.getDay();
  const isWeekend = day === 0 || day === 6;
  const mmdd = `${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
  const isHoliday = NSE_HOLIDAYS.has(mmdd);

  if (isWeekend || isHoliday) {
    return { isOpen: false, isWeekend, isHoliday };
  }

  const mins = ist.getHours() * 60 + ist.getMinutes();
  const isOpen = mins >= 555 && mins <= 930; // 9:15 AM - 3:30 PM IST

  return { isOpen, isWeekend, isHoliday };
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
    const prices = await fetchPrices(requestedSymbols);

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
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch prices', marketStatus: market },
      { status: 500 }
    );
  }
}
