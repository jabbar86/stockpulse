import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getHistoricalData } from '@/lib/market-data/provider';
import { z } from 'zod';

const querySchema = z.object({
  symbol: z.string().min(1).max(20),
  period: z.enum(['1mo', '3mo', '6mo', '1y', '5y']).default('1y'),
});

// GET /api/stocks/historical?symbol=xxx&period=1y - fetch historical price data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      symbol: searchParams.get('symbol'),
      period: searchParams.get('period') || '1y',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { symbol, period } = parsed.data;
    const upperSymbol = symbol.toUpperCase();

    const data = await getHistoricalData(upperSymbol, period);

    return NextResponse.json({ symbol: upperSymbol, period, data });
  } catch (error) {
    console.error('Historical data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
