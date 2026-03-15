import type { StockQuote } from '@/types';

const FYERS_API_BASE = 'https://api-t1.fyers.in/api/v3';

function formatFyersSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
  return `NSE:${clean}-EQ`;
}

export function isFyersConfigured(): boolean {
  return !!(process.env.FYERS_APP_ID && process.env.FYERS_ACCESS_TOKEN);
}

// Token cache for FYERS
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getFyersToken(): Promise<string> {
  // If access token is directly provided (from OAuth flow)
  const directToken = process.env.FYERS_ACCESS_TOKEN;
  if (directToken) return directToken;

  // Auto-login flow with app_id + secret
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const appId = process.env.FYERS_APP_ID!;
  const secretKey = process.env.FYERS_SECRET_KEY;

  if (!secretKey) {
    throw new Error('FYERS_SECRET_KEY required for auto-login');
  }

  // For FYERS, the access token typically comes from OAuth flow
  // The user needs to complete OAuth once and store the token
  throw new Error('FYERS requires OAuth access token. Set FYERS_ACCESS_TOKEN in env.');
}

export async function getFyersQuote(symbol: string): Promise<StockQuote> {
  const token = await getFyersToken();
  const appId = process.env.FYERS_APP_ID!;
  const fyersSymbol = formatFyersSymbol(symbol);

  const response = await fetch(`${FYERS_API_BASE}/quotes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${appId}:${token}`,
    },
    body: JSON.stringify({
      symbols: fyersSymbol,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`FYERS quote failed (${response.status}): ${body}`);
  }

  const json = await response.json();

  if (json.s !== 'ok' || !json.d || json.d.length === 0) {
    throw new Error(`FYERS: no data for ${symbol}: ${json.message || 'Unknown error'}`);
  }

  const q = json.d[0].v;
  const change = q.lp - q.prev_close_price;
  const changePercent = q.prev_close_price > 0 ? (change / q.prev_close_price) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    name: q.short_name || q.description || symbol.toUpperCase(),
    price: q.lp,
    change,
    changePercent,
    previousClose: q.prev_close_price,
    open: q.open_price,
    dayHigh: q.high_price,
    dayLow: q.low_price,
    volume: q.volume,
    fiftyTwoWeekHigh: q.high_price_52w || undefined,
    fiftyTwoWeekLow: q.low_price_52w || undefined,
  };
}

export async function getFyersLTP(
  symbols: string[]
): Promise<Map<string, { price: number; change: number; changePercent: number }>> {
  const result = new Map<string, { price: number; change: number; changePercent: number }>();

  try {
    const token = await getFyersToken();
    const appId = process.env.FYERS_APP_ID!;
    const fyersSymbols = symbols.map(formatFyersSymbol).join(',');

    const response = await fetch(`${FYERS_API_BASE}/quotes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${appId}:${token}`,
      },
      body: JSON.stringify({
        symbols: fyersSymbols,
      }),
    });

    if (!response.ok) return result;

    const json = await response.json();
    if (json.s !== 'ok' || !json.d) return result;

    for (const item of json.d) {
      const v = item.v;
      // Extract symbol from FYERS format "NSE:RELIANCE-EQ"
      const sym = item.n?.replace(/^NSE:/, '').replace(/-EQ$/, '') || '';
      if (sym && v.lp) {
        const change = v.lp - v.prev_close_price;
        const changePercent = v.prev_close_price > 0 ? (change / v.prev_close_price) * 100 : 0;
        result.set(sym, { price: v.lp, change, changePercent });
      }
    }
  } catch {
    // silently fail
  }

  return result;
}
