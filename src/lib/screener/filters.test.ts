import { describe, expect, it } from 'vitest';
import type { HistoricalDataPoint } from '@/types';
import {
  applyFilters,
  buildSnapshot,
  findRecentCross,
  matchesFilters,
  type ScreenerSnapshot,
} from './filters';

function candles(closes: number[], volumes?: number[]): HistoricalDataPoint[] {
  return closes.map((c, i) => ({
    date: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: c,
    high: c * 1.01,
    low: c * 0.99,
    close: c,
    volume: volumes?.[i] ?? 1000,
  }));
}

const base: ScreenerSnapshot = {
  symbol: 'TEST',
  price: 100,
  changePercent: 0,
  rsi14: 50,
  sma50: 95,
  sma200: 90,
  maCross: null,
  macdCross: null,
  macd: 0,
  macdSignal: 0,
  high52w: 120,
  low52w: 80,
  volume: 1000,
  avgVolume20: 1000,
  volumeRatio: 1,
};

describe('findRecentCross', () => {
  it('detects an upward cross and how many bars ago', () => {
    expect(findRecentCross([1, 1, 3, 4], [2, 2, 2, 2], 5)).toEqual({ up: true, barsAgo: 1 });
  });
  it('detects a downward cross on the latest bar', () => {
    expect(findRecentCross([3, 3, 1], [2, 2, 2], 5)).toEqual({ up: false, barsAgo: 0 });
  });
  it('ignores crosses outside the lookback', () => {
    expect(findRecentCross([1, 3, 3, 3, 3], [2, 2, 2, 2, 2], 2)).toBeNull();
  });
  it('right-aligns arrays of different length', () => {
    expect(findRecentCross([9, 9, 1, 3], [2, 2], 5)).toEqual({ up: true, barsAgo: 0 });
  });
});

describe('matchesFilters', () => {
  it('passes with no filters', () => {
    expect(matchesFilters(base, {})).toBe(true);
  });
  it('applies RSI range', () => {
    expect(matchesFilters({ ...base, rsi14: 25 }, { rsiMax: 30 })).toBe(true);
    expect(matchesFilters({ ...base, rsi14: 35 }, { rsiMax: 30 })).toBe(false);
    expect(matchesFilters({ ...base, rsi14: 75 }, { rsiMin: 70 })).toBe(true);
    expect(matchesFilters({ ...base, rsi14: null }, { rsiMin: 70 })).toBe(false);
  });
  it('applies price vs DMA', () => {
    expect(matchesFilters(base, { sma50: 'above', sma200: 'above' })).toBe(true);
    expect(matchesFilters(base, { sma50: 'below' })).toBe(false);
    expect(matchesFilters({ ...base, sma200: null }, { sma200: 'above' })).toBe(false);
  });
  it('applies crossovers', () => {
    const s = { ...base, maCross: { type: 'golden' as const, barsAgo: 2 }, macdCross: { type: 'bearish' as const, barsAgo: 0 } };
    expect(matchesFilters(s, { maCross: 'golden' })).toBe(true);
    expect(matchesFilters(s, { maCross: 'death' })).toBe(false);
    expect(matchesFilters(s, { macdCross: 'bullish' })).toBe(false);
    expect(matchesFilters(base, { macdCross: 'bullish' })).toBe(false);
  });
  it('applies 52-week proximity', () => {
    expect(matchesFilters({ ...base, price: 115 }, { near52wHighPct: 5 })).toBe(true);
    expect(matchesFilters({ ...base, price: 110 }, { near52wHighPct: 5 })).toBe(false);
    expect(matchesFilters({ ...base, price: 83 }, { near52wLowPct: 5 })).toBe(true);
    expect(matchesFilters({ ...base, price: 90 }, { near52wLowPct: 5 })).toBe(false);
  });
  it('applies volume spike', () => {
    expect(matchesFilters({ ...base, volumeRatio: 2 }, { minVolumeRatio: 1.5 })).toBe(true);
    expect(matchesFilters({ ...base, volumeRatio: 1.2 }, { minVolumeRatio: 1.5 })).toBe(false);
    expect(matchesFilters({ ...base, volumeRatio: null }, { minVolumeRatio: 1.5 })).toBe(false);
  });
  it('combines filters with AND', () => {
    const list = [
      { ...base, symbol: 'A', rsi14: 25, volumeRatio: 2 },
      { ...base, symbol: 'B', rsi14: 25, volumeRatio: 1 },
      { ...base, symbol: 'C', rsi14: 50, volumeRatio: 2 },
    ];
    expect(applyFilters(list, { rsiMax: 30, minVolumeRatio: 1.5 }).map((s) => s.symbol)).toEqual(['A']);
  });
});

describe('buildSnapshot', () => {
  it('returns null on too little data', () => {
    expect(buildSnapshot('X', candles([1, 2, 3]))).toBeNull();
  });

  it('computes a steadily falling series as oversold with price below DMAs', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 500 - i);
    const s = buildSnapshot('X', candles(closes))!;
    expect(s.price).toBe(241);
    expect(s.rsi14).not.toBeNull();
    expect(s.rsi14!).toBeLessThan(30);
    expect(s.sma50).not.toBeNull();
    expect(s.price).toBeLessThan(s.sma50!);
    expect(s.price).toBeLessThan(s.sma200!);
    expect(s.low52w).toBeCloseTo(241 * 0.99);
  });

  it('detects a recent golden cross', () => {
    // Long decline then sharp rally so the 50 DMA overtakes the 200 DMA near the end.
    const down = Array.from({ length: 220 }, (_, i) => 300 - i * 0.5);
    let found = false;
    for (let extra = 1; extra <= 120 && !found; extra++) {
      const up = Array.from({ length: extra }, (_, i) => 190 + i * 4);
      const s = buildSnapshot('X', candles([...down, ...up]));
      if (s?.maCross?.type === 'golden') found = true;
    }
    expect(found).toBe(true);
  });

  it('computes volume ratio against prior 20 sessions', () => {
    const closes = Array.from({ length: 60 }, () => 100);
    const vols = Array.from({ length: 60 }, (_, i) => (i === 59 ? 3000 : 1000));
    const s = buildSnapshot('X', candles(closes, vols))!;
    expect(s.avgVolume20).toBe(1000);
    expect(s.volumeRatio).toBe(3);
  });
});
