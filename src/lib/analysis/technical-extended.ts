import type { HistoricalDataPoint } from '@/types';

/** Average True Range (14-period) */
export function calculateATR(data: HistoricalDataPoint[], period = 14): number {
  if (data.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // Wilder's smoothing: first ATR is simple average, then exponential
  let atr = trueRanges.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return Math.round(atr * 100) / 100;
}

/** Volume Weighted Average Price (for intraday data) */
export function calculateVWAP(data: HistoricalDataPoint[]): number {
  if (data.length === 0) return 0;

  let cumulativeTPV = 0; // typical price * volume
  let cumulativeVolume = 0;

  for (const bar of data) {
    const tp = (bar.high + bar.low + bar.close) / 3;
    cumulativeTPV += tp * bar.volume;
    cumulativeVolume += bar.volume;
  }

  if (cumulativeVolume === 0) return data[data.length - 1].close;
  return Math.round((cumulativeTPV / cumulativeVolume) * 100) / 100;
}

/** Fibonacci retracement levels from a recent swing high/low */
export function calculateFibonacciLevels(data: HistoricalDataPoint[]): {
  swingHigh: number;
  swingLow: number;
  levels: { ratio: number; label: string; price: number }[];
} | null {
  if (data.length < 20) return null;

  const recent = data.slice(-60); // Use last ~60 bars for swing detection
  const swingHigh = Math.max(...recent.map((d) => d.high));
  const swingLow = Math.min(...recent.map((d) => d.low));

  if (swingHigh === swingLow) return null;

  const diff = swingHigh - swingLow;
  const currentPrice = data[data.length - 1].close;

  // Determine direction: if price is closer to high, we're retracing down
  const isUptrend = currentPrice > (swingHigh + swingLow) / 2;

  const RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const LABELS = ['0%', '23.6%', '38.2%', '50%', '61.8%', '78.6%', '100%'];

  const levels = RATIOS.map((ratio, i) => ({
    ratio,
    label: LABELS[i],
    price: Math.round(
      (isUptrend ? swingHigh - diff * ratio : swingLow + diff * ratio) * 100
    ) / 100,
  }));

  return { swingHigh, swingLow, levels };
}
