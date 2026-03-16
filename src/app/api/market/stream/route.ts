import { NextRequest } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Symbols to stream — indices + top traded stocks
const STREAM_SYMBOLS = [
  // Indices
  '^NSEI', '^BSESN', '^NSEBANK',
  // Commodities
  'GC=F', 'SI=F', 'CL=F',
  // Top 50 most-traded NSE stocks
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'ITC.NS',
  'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'WIPRO.NS', 'HCLTECH.NS',
  'TATAMOTORS.NS', 'TATASTEEL.NS', 'SUNPHARMA.NS', 'NTPC.NS', 'MARUTI.NS',
  'TITAN.NS', 'ADANIENT.NS', 'ADANIPORTS.NS', 'POWERGRID.NS', 'TECHM.NS',
  'M&M.NS', 'DRREDDY.NS', 'BAJAJFINSV.NS', 'CIPLA.NS', 'DIVISLAB.NS',
  'ONGC.NS', 'JSWSTEEL.NS', 'NESTLEIND.NS', 'TATAPOWER.NS', 'COALINDIA.NS',
  'BAJAJ-AUTO.NS', 'EICHERMOT.NS', 'GRASIM.NS', 'BRITANNIA.NS', 'ULTRACEMCO.NS',
  'INDUSINDBK.NS', 'HINDALCO.NS', 'BPCL.NS', 'VEDL.NS', 'TRENT.NS',
  'ZOMATO.NS', 'HAL.NS', 'BEL.NS', 'DLF.NS', 'IRCTC.NS',
];

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

// ---------------------------------------------------------------------------
// Market hours helper
// ---------------------------------------------------------------------------
function getMarketStatus(): { isOpen: boolean; isWeekend: boolean; isHoliday: boolean } {
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

// ---------------------------------------------------------------------------
// In-memory price cache
// ---------------------------------------------------------------------------
const priceCache = new Map<string, PriceUpdate>();
let cachePopulatedAt = 0;
let cacheTradingDate = '';

function getISTDateString(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

function invalidateStaleCache(): void {
  const today = getISTDateString();
  if (cacheTradingDate && cacheTradingDate !== today) {
    priceCache.clear();
    cachePopulatedAt = 0;
    cacheTradingDate = '';
  }
}

function getCachedPrices(symbols: string[]): PriceUpdate[] | null {
  if (priceCache.size === 0) return null;

  const results: PriceUpdate[] = [];
  for (const sym of symbols) {
    const key = sym.replace('.NS', '').replace('.BO', '');
    const cached = priceCache.get(key);
    if (cached) results.push(cached);
  }

  return results.length >= symbols.length * 0.5 ? results : null;
}

function updateCache(prices: PriceUpdate[]): void {
  for (const p of prices) {
    priceCache.set(p.symbol, p);
  }
  cachePopulatedAt = Date.now();
  cacheTradingDate = getISTDateString();
}

// ---------------------------------------------------------------------------
// Yahoo fetch
// ---------------------------------------------------------------------------
async function fetchBatchPrices(symbols: string[]): Promise<PriceUpdate[]> {
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

// ---------------------------------------------------------------------------
// SSE endpoint
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Parse requested symbols
  const symbolsParam = request.nextUrl.searchParams.get('symbols');
  const requestedSymbols = symbolsParam
    ? symbolsParam.split(',').map((s) => {
        const trimmed = s.trim().toUpperCase();
        if (trimmed.endsWith('.NS') || trimmed.endsWith('.BO') || trimmed.startsWith('^') || trimmed.includes('=')) {
          return trimmed;
        }
        return `${trimmed}.NS`;
      })
    : STREAM_SYMBOLS;

  const market = getMarketStatus();
  invalidateStaleCache();

  // ─── After hours: serve from cache (single response, no streaming) ───
  if (!market.isOpen) {
    let prices: PriceUpdate[];
    const cached = getCachedPrices(requestedSymbols);

    if (cached && cached.length > 0) {
      prices = cached;
    } else {
      // No cache — fetch once and cache it
      prices = await fetchBatchPrices(requestedSymbols);
      updateCache(prices);
    }

    const closedMessage = market.isWeekend
      ? 'Market closed — weekend'
      : market.isHoliday
      ? 'Market closed — holiday'
      : 'Market closed — after hours';

    const body = [
      `data: ${JSON.stringify({ type: 'prices', data: prices, source: 'cache', marketOpen: false, cachedAt: cachePopulatedAt })}\n\n`,
      `data: ${JSON.stringify({ type: 'market_status', isOpen: false, isWeekend: market.isWeekend, isHoliday: market.isHoliday, message: closedMessage, cachedAt: cachePopulatedAt })}\n\n`,
    ].join('');

    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  // ─── Market is OPEN: stream live prices ───
  let isActive = true;
  let controllerClosed = false;

  // Safe enqueue — silently no-ops if controller is closed
  function safeSend(controller: ReadableStreamDefaultController, message: string): boolean {
    if (controllerClosed || !isActive) return false;
    try {
      controller.enqueue(encoder.encode(message));
      return true;
    } catch {
      controllerClosed = true;
      isActive = false;
      return false;
    }
  }

  function safeClose(controller: ReadableStreamDefaultController) {
    if (controllerClosed) return;
    controllerClosed = true;
    isActive = false;
    try { controller.close(); } catch { /* already closed */ }
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Register abort handler immediately
      request.signal.addEventListener('abort', () => {
        isActive = false;
        safeClose(controller);
      });

      // Send market open status
      safeSend(controller, `data: ${JSON.stringify({ type: 'market_status', isOpen: true })}\n\n`);

      // Send initial prices
      if (isActive) {
        try {
          const prices = await fetchBatchPrices(requestedSymbols);
          if (!isActive) return; // Client disconnected during fetch
          updateCache(prices);
          safeSend(controller, `data: ${JSON.stringify({ type: 'prices', data: prices, source: 'live', marketOpen: true })}\n\n`);
        } catch {
          // fetch failed — continue, will retry on next push
        }
      }

      // Recurring push
      async function push() {
        if (!isActive) return;

        // Check if market just closed
        const currentStatus = getMarketStatus();
        if (!currentStatus.isOpen) {
          const cached = getCachedPrices(requestedSymbols);
          if (cached) {
            safeSend(controller, `data: ${JSON.stringify({ type: 'prices', data: cached, source: 'closing', marketOpen: false })}\n\n`);
          }
          safeSend(controller, `data: ${JSON.stringify({ type: 'market_status', isOpen: false, message: 'Market closed — stream ending', cachedAt: cachePopulatedAt })}\n\n`);
          safeClose(controller);
          return;
        }

        try {
          const prices = await fetchBatchPrices(requestedSymbols);
          if (!isActive) return; // Client disconnected during fetch
          updateCache(prices);
          safeSend(controller, `data: ${JSON.stringify({ type: 'prices', data: prices, source: 'live', marketOpen: true })}\n\n`);
        } catch {
          // fetch failed — will retry next cycle
        }

        if (isActive) {
          setTimeout(push, 5000);
        }
      }

      // Start push loop
      if (isActive) {
        setTimeout(push, 5000);
      }

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        if (!isActive) {
          clearInterval(heartbeat);
          return;
        }
        if (!safeSend(controller, `: heartbeat\n\n`)) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Also clear heartbeat on abort
      request.signal.addEventListener('abort', () => clearInterval(heartbeat));
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
