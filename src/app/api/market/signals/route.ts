import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getHistoricalData } from '@/lib/market-data/provider';
import { computeBreakoutSignal, computePullbackLongSignal, computeOverextendedExitSignal } from '@/lib/analysis/signals';
import type { StrategySignal } from '@/types';

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

    let symbols: { symbol: string; name?: string }[] = [];

    if (symbolsParam) {
      symbols = symbolsParam.split(',').map((raw) => {
        const s = raw.trim().toUpperCase();
        return { symbol: s, name: s };
      });
    } else {
      const serviceClient = createServiceRoleClient();
      const { data: watchlist } = await serviceClient
        .from('watchlist')
        .select('symbol,name')
        .eq('user_id', userId)
        .limit(30);

      if (watchlist && watchlist.length > 0) {
        symbols = watchlist.map((w) => ({
          symbol: (w as any).symbol as string,
          name: (w as any).name as string,
        }));
      }
    }

    if (symbols.length === 0) {
      return NextResponse.json({ signals: [] });
    }

    const signals: StrategySignal[] = [];

    for (const { symbol, name } of symbols) {
      try {
        const candles = await getHistoricalData(symbol, '6mo');
        if (!candles || candles.length === 0) continue;

        const breakout = computeBreakoutSignal({ symbol, name, candles });
        const pullback = computePullbackLongSignal({ symbol, name, candles });
        const exit = computeOverextendedExitSignal({ symbol, name, candles });

        if (breakout) signals.push(breakout);
        if (pullback) signals.push(pullback);
        if (exit) signals.push(exit);
      } catch (e) {
        // skip this symbol on failure
        console.warn('Signal generation failed for', symbol, e);
      }
    }

    signals.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      signals,
      generatedAt: new Date().toISOString(),
      count: signals.length,
    });
  } catch (error) {
    console.error('Market signals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

