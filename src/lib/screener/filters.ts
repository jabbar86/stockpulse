/**
 * Pure technical-screener logic: build a per-symbol snapshot from daily candles,
 * then filter snapshots with AND-combined criteria. No I/O here.
 */
import { RSI, MACD, SMA } from 'technicalindicators';
import type { HistoricalDataPoint } from '@/types';

export interface ScreenerSnapshot {
  symbol: string;
  price: number;
  changePercent: number;
  rsi14: number | null;
  sma50: number | null;
  sma200: number | null;
  /** Bars since the 50 DMA last crossed the 200 DMA (positive = golden, negative = death); null if no cross in lookback. */
  maCross: { type: 'golden' | 'death'; barsAgo: number } | null;
  /** Bars since MACD line last crossed its signal line; null if no cross in lookback. */
  macdCross: { type: 'bullish' | 'bearish'; barsAgo: number } | null;
  macd: number | null;
  macdSignal: number | null;
  high52w: number;
  low52w: number;
  volume: number;
  avgVolume20: number | null;
  /** Latest volume / 20-day average volume (excluding today). */
  volumeRatio: number | null;
}

/** How far back (in bars) to look for MA / MACD crossovers. */
export const MA_CROSS_LOOKBACK = 10;
export const MACD_CROSS_LOOKBACK = 3;

function lastOrNull(arr: number[]): number | null {
  return arr.length > 0 ? arr[arr.length - 1] : null;
}

/**
 * Find the most recent crossing of `a` over/under `b` within `lookback` bars.
 * Arrays must be right-aligned (last element = latest bar).
 */
export function findRecentCross(
  a: number[],
  b: number[],
  lookback: number
): { up: boolean; barsAgo: number } | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const aOff = a.length - n;
  const bOff = b.length - n;
  for (let i = n - 1; i >= Math.max(1, n - 1 - lookback); i--) {
    const prevDiff = a[aOff + i - 1] - b[bOff + i - 1];
    const diff = a[aOff + i] - b[bOff + i];
    if (prevDiff <= 0 && diff > 0) return { up: true, barsAgo: n - 1 - i };
    if (prevDiff >= 0 && diff < 0) return { up: false, barsAgo: n - 1 - i };
  }
  return null;
}

export function buildSnapshot(
  symbol: string,
  candles: HistoricalDataPoint[]
): ScreenerSnapshot | null {
  const rows = candles.filter((c) => Number.isFinite(c.close) && c.close > 0);
  if (rows.length < 30) return null;

  const closes = rows.map((r) => r.close);
  const price = closes[closes.length - 1];
  const prev = closes[closes.length - 2];
  const changePercent = prev > 0 ? ((price - prev) / prev) * 100 : 0;

  const rsi14 = lastOrNull(RSI.calculate({ values: closes, period: 14 }));
  const sma50Arr = SMA.calculate({ values: closes, period: 50 });
  const sma200Arr = SMA.calculate({ values: closes, period: 200 });

  const ma = sma200Arr.length > 1 ? findRecentCross(sma50Arr, sma200Arr, MA_CROSS_LOOKBACK) : null;

  const macdArr = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  }).filter((m) => m.MACD != null && m.signal != null);
  const macdLine = macdArr.map((m) => m.MACD as number);
  const macdSig = macdArr.map((m) => m.signal as number);
  const mc = findRecentCross(macdLine, macdSig, MACD_CROSS_LOOKBACK);

  const last252 = rows.slice(-252);
  const high52w = Math.max(...last252.map((r) => r.high || r.close));
  const low52w = Math.min(...last252.map((r) => (r.low > 0 ? r.low : r.close)));

  const volume = rows[rows.length - 1].volume ?? 0;
  const prior = rows.slice(-21, -1).map((r) => r.volume ?? 0);
  const avgVolume20 = prior.length >= 10 ? prior.reduce((s, v) => s + v, 0) / prior.length : null;
  const volumeRatio = avgVolume20 && avgVolume20 > 0 ? volume / avgVolume20 : null;

  return {
    symbol,
    price,
    changePercent,
    rsi14,
    sma50: lastOrNull(sma50Arr),
    sma200: lastOrNull(sma200Arr),
    maCross: ma ? { type: ma.up ? 'golden' : 'death', barsAgo: ma.barsAgo } : null,
    macdCross: mc ? { type: mc.up ? 'bullish' : 'bearish', barsAgo: mc.barsAgo } : null,
    macd: lastOrNull(macdLine),
    macdSignal: lastOrNull(macdSig),
    high52w,
    low52w,
    volume,
    avgVolume20,
    volumeRatio,
  };
}

export type AboveBelow = 'above' | 'below';

export interface ScreenerFilters {
  rsiMin?: number;
  rsiMax?: number;
  sma50?: AboveBelow;
  sma200?: AboveBelow;
  maCross?: 'golden' | 'death';
  macdCross?: 'bullish' | 'bearish';
  /** Within this % of the 52-week high. */
  near52wHighPct?: number;
  /** Within this % of the 52-week low. */
  near52wLowPct?: number;
  /** Latest volume at least this multiple of the 20-day average. */
  minVolumeRatio?: number;
}

function cmp(price: number, ma: number | null, side: AboveBelow): boolean {
  if (ma == null) return false;
  return side === 'above' ? price > ma : price < ma;
}

export function matchesFilters(s: ScreenerSnapshot, f: ScreenerFilters): boolean {
  if (f.rsiMin != null && (s.rsi14 == null || s.rsi14 < f.rsiMin)) return false;
  if (f.rsiMax != null && (s.rsi14 == null || s.rsi14 > f.rsiMax)) return false;
  if (f.sma50 && !cmp(s.price, s.sma50, f.sma50)) return false;
  if (f.sma200 && !cmp(s.price, s.sma200, f.sma200)) return false;
  if (f.maCross && s.maCross?.type !== f.maCross) return false;
  if (f.macdCross && s.macdCross?.type !== f.macdCross) return false;
  if (f.near52wHighPct != null) {
    if (!(s.high52w > 0) || ((s.high52w - s.price) / s.high52w) * 100 > f.near52wHighPct) return false;
  }
  if (f.near52wLowPct != null) {
    if (!(s.low52w > 0) || ((s.price - s.low52w) / s.low52w) * 100 > f.near52wLowPct) return false;
  }
  if (f.minVolumeRatio != null && (s.volumeRatio == null || s.volumeRatio < f.minVolumeRatio)) {
    return false;
  }
  return true;
}

export function applyFilters(snapshots: ScreenerSnapshot[], f: ScreenerFilters): ScreenerSnapshot[] {
  return snapshots.filter((s) => matchesFilters(s, f));
}

export type ScreenerPresetId =
  | 'oversold'
  | 'overbought'
  | 'golden-cross'
  | 'macd-bullish'
  | 'near-52w-high'
  | 'volume-spike';

export const SCREENER_PRESETS: { id: ScreenerPresetId; label: string; description: string; filters: ScreenerFilters }[] = [
  { id: 'oversold', label: 'Oversold', description: 'RSI(14) below 30', filters: { rsiMax: 30 } },
  { id: 'overbought', label: 'Overbought', description: 'RSI(14) above 70', filters: { rsiMin: 70 } },
  {
    id: 'golden-cross',
    label: 'Golden cross',
    description: `50 DMA crossed above 200 DMA in the last ${MA_CROSS_LOOKBACK} sessions`,
    filters: { maCross: 'golden' },
  },
  {
    id: 'macd-bullish',
    label: 'MACD bullish',
    description: `MACD crossed above signal in the last ${MACD_CROSS_LOOKBACK} sessions`,
    filters: { macdCross: 'bullish' },
  },
  {
    id: 'near-52w-high',
    label: 'Near 52W high',
    description: 'Within 5% of the 52-week high',
    filters: { near52wHighPct: 5 },
  },
  {
    id: 'volume-spike',
    label: 'Volume spike',
    description: 'Volume at least 1.5× the 20-day average',
    filters: { minVolumeRatio: 1.5 },
  },
];
