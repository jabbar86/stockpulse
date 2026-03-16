import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getHistoricalData } from '@/lib/market-data/provider';
import {
  computeBreakoutSignal,
  computePullbackLongSignal,
  computeOverextendedExitSignal,
} from '@/lib/analysis/signals';
import { buildStockRecommendation } from '@/lib/analysis/stock-recommendation';
import type { StockRecommendation, StrategySignal } from '@/types';

const DEFAULT_UNIVERSE: { symbol: string; name: string }[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd' },
  { symbol: 'INFY', name: 'Infosys Ltd' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
  { symbol: 'ITC', name: 'ITC Ltd' },
  { symbol: 'SBIN', name: 'State Bank of India' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd' },
  { symbol: 'WIPRO', name: 'Wipro Ltd' },
];

export const maxDuration = 30;

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
    const symbolsParam = url.searchParams.get('symbols');

    const symbols: { symbol: string; name?: string }[] = [];

    if (symbolsParam) {
      symbols.push(
        ...symbolsParam.split(',').map((raw) => {
          const s = raw.trim().toUpperCase();
          return { symbol: s, name: s };
        })
      );
    }

    // Always include a default large-cap universe so engine works even without favourites
    if (!symbolsParam) {
      symbols.push(...DEFAULT_UNIVERSE);

      // Also blend in watchlist if user has one
      const serviceClient = createServiceRoleClient();
      const { data: watchlist } = await serviceClient
        .from('watchlist')
        .select('symbol,name')
        .eq('user_id', userId)
        .limit(30);

      if (watchlist && watchlist.length > 0) {
        for (const w of watchlist) {
          const sym = (w as any).symbol as string;
          if (!symbols.find((s) => s.symbol === sym)) {
            symbols.push({
              symbol: sym,
              name: (w as any).name as string,
            });
          }
        }
      }
    }

    if (symbols.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const recommendations: StockRecommendation[] = [];

    for (const { symbol, name } of symbols) {
      try {
        const candles = await getHistoricalData(symbol, '6mo');
        if (!candles || candles.length === 0) continue;

        const symbolSignals: StrategySignal[] = [];
        const breakout = computeBreakoutSignal({ symbol, name, candles });
        const pullback = computePullbackLongSignal({ symbol, name, candles });
        const exit = computeOverextendedExitSignal({ symbol, name, candles });

        if (breakout) symbolSignals.push(breakout);
        if (pullback) symbolSignals.push(pullback);
        if (exit) symbolSignals.push(exit);

        const rec = buildStockRecommendation(symbol, name, symbolSignals);
        if (rec) {
          recommendations.push(rec);
        }
      } catch (e) {
        console.warn('Recommendation generation failed for', symbol, e);
      }
    }

    recommendations.sort((a, b) => b.conviction - a.conviction);

    return NextResponse.json({
      recommendations,
      generatedAt: new Date().toISOString(),
      count: recommendations.length,
    });
  } catch (error) {
    console.error('Stock recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

