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
import type { StockRecommendation, StrategySignal, StrategyTimeframe } from '@/types';

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
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      intraday: topN(intraday, limit),
      swing: topN(swing, limit),
      long_term: topN(positional, limit),
      generatedAt: new Date().toISOString(),
      universeSize: MARKET_UNIVERSE.length,
    });
  } catch (error) {
    console.error('Market recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

