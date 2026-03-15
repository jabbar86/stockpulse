import { gunzipSync } from 'zlib';

const INSTRUMENTS_URL = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';

let instrumentMap: Map<string, string> | null = null;

interface UpstoxInstrument {
  trading_symbol: string;
  instrument_key: string;
  instrument_type: string;
  exchange: string;
}

async function loadInstruments(): Promise<Map<string, string>> {
  if (instrumentMap) return instrumentMap;

  const response = await fetch(INSTRUMENTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to download Upstox instruments: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const decompressed = gunzipSync(buffer);
  const instruments: UpstoxInstrument[] = JSON.parse(decompressed.toString('utf-8'));

  const map = new Map<string, string>();
  for (const inst of instruments) {
    if (inst.instrument_type === 'EQUITY' && inst.exchange === 'NSE_EQ') {
      map.set(inst.trading_symbol, inst.instrument_key);
    }
  }

  instrumentMap = map;
  return map;
}

export async function getInstrumentKey(symbol: string): Promise<string | null> {
  try {
    const map = await loadInstruments();
    return map.get(symbol.toUpperCase()) ?? null;
  } catch (error) {
    console.error('Failed to load Upstox instruments:', error);
    return null;
  }
}

export async function getInstrumentKeys(symbols: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  try {
    const map = await loadInstruments();
    for (const symbol of symbols) {
      const key = map.get(symbol.toUpperCase());
      if (key) {
        result.set(symbol.toUpperCase(), key);
      }
    }
  } catch (error) {
    console.error('Failed to load Upstox instruments:', error);
  }
  return result;
}
