import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { pricesToReturns, pearsonCorrelation } from '@/lib/analysis/risk-scoring';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const symbols: string[] = body.symbols;

    if (!Array.isArray(symbols) || symbols.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 symbols' }, { status: 400 });
    }

    const limited = symbols.slice(0, 10);

    // Fetch 90-day historical data for each symbol
    const historicalPromises = limited.map(async (sym) => {
      try {
        const yahooSym = sym.includes('.') ? sym : `${sym}.NS`;
        const { default: yahooFinance } = await import('yahoo-finance2');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);

        const result = await yahooFinance.historical(yahooSym, {
          period1: startDate.toISOString().split('T')[0],
          period2: endDate.toISOString().split('T')[0],
        });

        return {
          symbol: sym,
          prices: (result as { close: number }[]).map((r) => r.close),
        };
      } catch {
        return { symbol: sym, prices: [] };
      }
    });

    const histories = await Promise.all(historicalPromises);

    // Calculate returns
    const returnsMap = new Map<string, number[]>();
    for (const h of histories) {
      if (h.prices.length > 5) {
        returnsMap.set(h.symbol, pricesToReturns(h.prices));
      }
    }

    const validSymbols = limited.filter((s) => returnsMap.has(s));
    const matrix: number[][] = [];

    for (let i = 0; i < validSymbols.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < validSymbols.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const a = returnsMap.get(validSymbols[i])!;
          const b = returnsMap.get(validSymbols[j])!;
          row.push(pearsonCorrelation(a, b));
        }
      }
      matrix.push(row);
    }

    return NextResponse.json(
      { symbols: validSymbols, matrix },
      {
        headers: {
          'Cache-Control': 'private, max-age=86400', // Cache 24h
        },
      }
    );
  } catch (error) {
    console.error('Correlation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Correlation calculation failed' },
      { status: 500 }
    );
  }
}
