import type { StockQuote } from '@/types';
import { getInstrumentKey, getInstrumentKeys } from '@/lib/brokers/upstox-instruments';

const UPSTOX_API_BASE = 'https://api.upstox.com/v2';

interface UpstoxOhlc {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface UpstoxQuoteData {
  ohlc: UpstoxOhlc;
  depth: unknown;
  timestamp: string;
  instrument_token: string;
  symbol: string;
  last_price: number;
  volume: number;
  average_price: number;
  oi: number;
  net_change: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  last_trade_time: string;
  oi_day_high: number;
  oi_day_low: number;
}

export async function getUpstoxQuote(
  symbol: string,
  accessToken: string
): Promise<StockQuote> {
  const instrumentKey = await getInstrumentKey(symbol);
  if (!instrumentKey) {
    throw new Error(`No Upstox instrument key found for symbol: ${symbol}`);
  }

  const response = await fetch(
    `${UPSTOX_API_BASE}/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upstox quote API failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  const data: Record<string, UpstoxQuoteData> = json.data ?? {};

  const quoteData = Object.values(data)[0];
  if (!quoteData) {
    throw new Error(`No quote data returned from Upstox for ${symbol}`);
  }

  const previousClose = quoteData.ohlc.close;
  const change = quoteData.last_price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
    price: quoteData.last_price,
    change,
    changePercent,
    previousClose,
    open: quoteData.ohlc.open,
    dayHigh: quoteData.ohlc.high,
    dayLow: quoteData.ohlc.low,
    volume: quoteData.volume,
  };
}

export async function getUpstoxLTP(
  symbols: string[],
  accessToken: string
): Promise<Map<string, { price: number; change: number; changePercent: number }>> {
  const result = new Map<string, { price: number; change: number; changePercent: number }>();

  const instrumentKeyMap = await getInstrumentKeys(symbols);
  if (instrumentKeyMap.size === 0) return result;

  // Reverse map: instrument_key → symbol
  const keyToSymbol = new Map<string, string>();
  for (const [sym, key] of instrumentKeyMap) {
    keyToSymbol.set(key, sym);
  }

  // Upstox allows up to 500 instrument keys per request
  const keys = Array.from(instrumentKeyMap.values());
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += 500) {
    batches.push(keys.slice(i, i + 500));
  }

  for (const batch of batches) {
    const instrumentKeysParam = batch.join(',');

    const response = await fetch(
      `${UPSTOX_API_BASE}/market-quote/ltp?instrument_key=${encodeURIComponent(instrumentKeysParam)}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Upstox LTP API failed (${response.status})`);
      continue;
    }

    const json = await response.json();
    const data: Record<string, { last_price: number; instrument_token: string }> = json.data ?? {};

    for (const [instrKey, ltpData] of Object.entries(data)) {
      const sym = keyToSymbol.get(instrKey);
      if (sym && ltpData.last_price != null) {
        result.set(sym, {
          price: ltpData.last_price,
          change: 0,
          changePercent: 0,
        });
      }
    }
  }

  return result;
}
