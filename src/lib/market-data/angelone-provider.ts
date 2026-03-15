import type { StockQuote } from '@/types';

const ANGELONE_API_BASE = 'https://apiconnect.angelone.in';

// Angel One SmartAPI symbol format: SYMBOL-EQ for NSE equity
function formatAngelSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
  return clean;
}

interface AngelOneQuoteData {
  exchange: string;
  tradingSymbol: string;
  symbolToken: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  lastTradeQty: number;
  exchFeedTime: string;
  exchTradeTime: string;
  netChange: number;
  percentChange: number;
  avgPrice: number;
  tradeVolume: number;
  opnInterest: number;
  lowerCircuit: number;
  upperCircuit: number;
  totBuyQuan: number;
  totSellQuan: number;
  '52WeekLow': number;
  '52WeekHigh': number;
}

export function isAngelOneConfigured(): boolean {
  return !!(
    process.env.ANGELONE_API_KEY &&
    process.env.ANGELONE_CLIENT_ID &&
    process.env.ANGELONE_PASSWORD &&
    process.env.ANGELONE_TOTP_SECRET
  );
}

// Generate TOTP for Angel One 2FA
async function generateTOTP(secret: string): Promise<string> {
  // Use a simple TOTP implementation
  // Angel One uses standard TOTP (RFC 6238)
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const counter = Math.floor(epoch / timeStep);

  // Convert counter to 8-byte buffer
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, counter, false);

  // Decode base32 secret
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const secretBytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of secret.toUpperCase()) {
    const idx = base32Chars.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      secretBytes.push((value >> bits) & 0xff);
    }
  }

  // HMAC-SHA1 using Web Crypto
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(secretBytes),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new Uint8Array(buffer));
  const hmac = new Uint8Array(signature);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

// Token cache
let cachedToken: { jwt: string; refreshToken: string; expiresAt: number } | null = null;

async function getAngelOneSession(): Promise<string> {
  // Return cached token if valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.jwt;
  }

  const apiKey = process.env.ANGELONE_API_KEY!;
  const clientId = process.env.ANGELONE_CLIENT_ID!;
  const password = process.env.ANGELONE_PASSWORD!;
  const totpSecret = process.env.ANGELONE_TOTP_SECRET!;

  const totp = await generateTOTP(totpSecret);

  const response = await fetch(`${ANGELONE_API_BASE}/rest/auth/angelbroking/user/v1/loginByPassword`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '127.0.0.1',
      'X-MACAddress': '00:00:00:00:00:00',
      'X-PrivateKey': apiKey,
    },
    body: JSON.stringify({
      clientcode: clientId,
      password,
      totp,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Angel One login failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  if (!json.data?.jwtToken) {
    throw new Error(`Angel One login failed: ${json.message || 'No token returned'}`);
  }

  cachedToken = {
    jwt: json.data.jwtToken,
    refreshToken: json.data.refreshToken,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000, // ~23 hours
  };

  return cachedToken.jwt;
}

export async function getAngelOneQuote(symbol: string): Promise<StockQuote> {
  const jwt = await getAngelOneSession();
  const apiKey = process.env.ANGELONE_API_KEY!;
  const tradingSymbol = formatAngelSymbol(symbol);

  // First, we need the symbol token - use search/scrip endpoint
  const searchRes = await fetch(
    `${ANGELONE_API_BASE}/rest/secure/angelbroking/order/v1/searchScrip`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${jwt}`,
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': apiKey,
      },
      body: JSON.stringify({
        exchange: 'NSE',
        searchscrip: tradingSymbol,
      }),
    }
  );

  if (!searchRes.ok) {
    throw new Error(`Angel One scrip search failed for ${symbol}`);
  }

  const searchJson = await searchRes.json();
  const scrip = searchJson.data?.find(
    (s: any) => s.tradingsymbol === tradingSymbol || s.tradingsymbol === `${tradingSymbol}-EQ`
  );

  if (!scrip) {
    throw new Error(`Angel One: symbol ${tradingSymbol} not found`);
  }

  // Get LTP data
  const quoteRes = await fetch(
    `${ANGELONE_API_BASE}/rest/secure/angelbroking/market/v1/quote/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${jwt}`,
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': apiKey,
      },
      body: JSON.stringify({
        mode: 'FULL',
        exchangeTokens: {
          NSE: [scrip.symboltoken],
        },
      }),
    }
  );

  if (!quoteRes.ok) {
    throw new Error(`Angel One quote failed for ${symbol}`);
  }

  const quoteJson = await quoteRes.json();
  const fetched = quoteJson.data?.fetched;
  if (!fetched || fetched.length === 0) {
    throw new Error(`Angel One: no quote data for ${symbol}`);
  }

  const q: AngelOneQuoteData = fetched[0];
  const change = q.ltp - q.close;
  const changePercent = q.close > 0 ? (change / q.close) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    name: q.tradingSymbol || symbol.toUpperCase(),
    price: q.ltp,
    change,
    changePercent,
    previousClose: q.close,
    open: q.open,
    dayHigh: q.high,
    dayLow: q.low,
    volume: q.tradeVolume,
    fiftyTwoWeekHigh: q['52WeekHigh'] || undefined,
    fiftyTwoWeekLow: q['52WeekLow'] || undefined,
  };
}
