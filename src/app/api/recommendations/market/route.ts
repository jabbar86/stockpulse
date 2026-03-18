import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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

export const maxDuration = 30;

// Keep universe modest to stay under timeouts for free data calls.
const MARKET_UNIVERSE: { symbol: string; name: string }[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd' },
  { symbol: 'INFY', name: 'Infosys Ltd' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd' },
  { symbol: 'SBIN', name: 'State Bank of India' },
  { symbol: 'ITC', name: 'ITC Ltd' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd' },
  { symbol: 'NTPC', name: 'NTPC Ltd' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd' },
  { symbol: 'WIPRO', name: 'Wipro Ltd' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
];

function topN(items: StockRecommendation[], n: number): StockRecommendation[] {
  return [...items].sort((a, b) => b.conviction - a.conviction).slice(0, n);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeCommonTrendRecommendation(
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = request.nextUrl;
    const limit = Math.max(1, Math.min(25, Number(url.searchParams.get('limit') || 8)));

    const intraday: StockRecommendation[] = [];
    const swing: StockRecommendation[] = [];
    const positional: StockRecommendation[] = [];
    const common: StockRecommendation[] = [];

    for (const { symbol, name } of MARKET_UNIVERSE) {
      // Intraday (5m)
      try {
        const candles5m = await getHistoricalData(symbol, '1d_5m');
        const s: StrategySignal[] = [];
        const intradayBreakout = computeIntradayBreakoutSignal({ symbol, name, candles: candles5m });
        if (intradayBreakout) s.push(intradayBreakout);
        const rec = buildStockRecommendation(symbol, name, s);
        if (rec) intraday.push(rec);
      } catch {
        // ignore single-symbol failures
      }

      // Swing (6mo daily)
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
        if (rec) swing.push(rec);
      } catch {
        // ignore
      }

      // Positional (1y daily)
      try {
        const candles = await getHistoricalData(symbol, '1y');
        const s: StrategySignal[] = [];
        const trend = computePositionalTrendSignal({ symbol, name, candles });
        if (trend) s.push(trend);
        const rec = buildStockRecommendation(symbol, name, s);
        if (rec) positional.push(rec);

        // Common tab: always try to produce a “best overall” list
        const commonRec = computeCommonTrendRecommendation(symbol, name, candles);
        if (commonRec) common.push(commonRec);
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      intraday: topN(intraday, limit),
      swing: topN(swing, limit),
      long_term: topN(positional, limit),
      common: topN(common, limit),
      generatedAt: new Date().toISOString(),
      universeSize: MARKET_UNIVERSE.length,
    });
  } catch (error) {
    console.error('Market recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

