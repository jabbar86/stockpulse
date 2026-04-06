import { getHistoricalData } from '@/lib/market-data/provider';
import {
  computeBreakoutSignal,
  computePullbackLongSignal,
  computeOverextendedExitSignal,
  computeIntradayBreakoutSignal,
  computePositionalTrendSignal,
} from '@/lib/analysis/signals';
import { buildStockRecommendation } from '@/lib/analysis/stock-recommendation';
import type { StockRecommendation, StrategySignal } from '@/types';
import { SMA, RSI, ATR } from 'technicalindicators';

export type RiskMode = 'atr' | 'fixed';

export interface RiskFixedBundle {
  intraday: { slPct: number; tpPct: number };
  swing: { slPct: number; tpPct: number };
  long_term: { slPct: number; tpPct: number };
}

export interface TimeframeRiskModes {
  intraday: RiskMode;
  swing: RiskMode;
  long_term: RiskMode;
}

export function parseRiskMode(value: string | null, fallback: RiskMode): RiskMode {
  if (value === 'atr' || value === 'fixed') return value;
  return fallback;
}

export function applyRiskRules(
  rec: StockRecommendation,
  mode: RiskMode,
  fixed: { slPct: number; tpPct: number }
): StockRecommendation {
  if (mode !== 'fixed') return rec;
  const entry = rec.entry;
  if (!Number.isFinite(entry) || entry <= 0) return rec;

  const stopLoss = entry * (1 - fixed.slPct / 100);
  const target = entry * (1 + fixed.tpPct / 100);

  return {
    ...rec,
    stop_loss: stopLoss,
    target,
    reason: `${rec.reason} (Fixed risk: SL ${fixed.slPct.toFixed(1)}% / TP ${fixed.tpPct.toFixed(1)}%)`,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeCommonTrendRecommendation(
  symbol: string,
  name: string,
  candles: { high: number; low: number; close: number; volume: number }[]
): StockRecommendation | null {
  if (candles.length < 220) return null;

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const sma50 = SMA.calculate({ values: closes, period: 50 });
  const sma200 = SMA.calculate({ values: closes, period: 200 });
  const rsi14 = RSI.calculate({ values: closes, period: 14 });
  const atr14 = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });

  const lastClose = closes[closes.length - 1];
  const s50 = sma50[sma50.length - 1];
  const s200 = sma200[sma200.length - 1];
  const rsi = rsi14[rsi14.length - 1];
  const atr = atr14[atr14.length - 1];

  if (![lastClose, s50, s200, rsi, atr].every((v) => typeof v === 'number' && isFinite(v))) {
    return null;
  }

  const trendScore =
    (lastClose > s200 ? 40 : 0) +
    (s50 > s200 ? 25 : 0) +
    clamp((rsi - 50) * 1.2, -20, 20);

  const conviction = clamp(Math.round(trendScore), 40, 85);
  const action: StockRecommendation['action'] = conviction >= 70 ? 'buy' : 'hold';

  const entry = lastClose;
  const stopLoss = entry - 2.2 * atr;
  const target = entry + 4.4 * atr;

  const reason =
    action === 'buy'
      ? 'Strong trend structure (price above 200D baseline, 50D above 200D) with healthy momentum.'
      : 'Stable trend bias. Keep on watch; consider entries on pullbacks with defined risk.';

  return {
    symbol,
    name,
    timeframe: 'positional',
    action,
    conviction,
    entry,
    stop_loss: stopLoss,
    target,
    reason,
    source_signal: 'positional_trend',
    generated_at: new Date().toISOString(),
  };
}

export function topN(items: StockRecommendation[], n: number): StockRecommendation[] {
  return [...items].sort((a, b) => b.conviction - a.conviction).slice(0, n);
}

export interface SymbolTimeframeRecommendations {
  intraday: StockRecommendation | null;
  swing: StockRecommendation | null;
  long_term: StockRecommendation | null;
  common: StockRecommendation | null;
}

export async function getTimeframeRecommendationsForSymbol(
  symbol: string,
  name: string,
  modes: TimeframeRiskModes,
  fixed: RiskFixedBundle
): Promise<SymbolTimeframeRecommendations> {
  let intraday: StockRecommendation | null = null;
  let swing: StockRecommendation | null = null;
  let long_term: StockRecommendation | null = null;
  let common: StockRecommendation | null = null;

  try {
    const candles5m = await getHistoricalData(symbol, '1d_5m');
    const s: StrategySignal[] = [];
    const intradayBreakout = computeIntradayBreakoutSignal({ symbol, name, candles: candles5m });
    if (intradayBreakout) s.push(intradayBreakout);
    const rec = buildStockRecommendation(symbol, name, s);
    if (rec) intraday = applyRiskRules(rec, modes.intraday, fixed.intraday);
  } catch {
    // ignore single-symbol failures
  }

  try {
    const candles = await getHistoricalData(symbol, '6mo');
    const s: StrategySignal[] = [];
    const breakout = computeBreakoutSignal({ symbol, name, candles });
    const pullback = computePullbackLongSignal({ symbol, name, candles });
    const exit = computeOverextendedExitSignal({ symbol, name, candles });
    if (breakout) s.push(breakout);
    if (pullback) s.push(pullback);
    if (exit) s.push(exit);
    const rec = buildStockRecommendation(symbol, name, s);
    if (rec) swing = applyRiskRules(rec, modes.swing, fixed.swing);
  } catch {
    // ignore
  }

  try {
    const candles = await getHistoricalData(symbol, '1y');
    const s: StrategySignal[] = [];
    const trend = computePositionalTrendSignal({ symbol, name, candles });
    if (trend) s.push(trend);
    const rec = buildStockRecommendation(symbol, name, s);
    if (rec) long_term = applyRiskRules(rec, modes.long_term, fixed.long_term);

    const commonRec = computeCommonTrendRecommendation(symbol, name, candles);
    if (commonRec) common = applyRiskRules(commonRec, modes.long_term, fixed.long_term);
  } catch {
    // ignore
  }

  return { intraday, swing, long_term, common };
}
