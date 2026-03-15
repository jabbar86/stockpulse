import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { searchStocks } from '@/lib/market-data/provider';

// GET /api/stocks?q=query - search stocks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (query.trim().length < 1) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchStocks(query.trim());

    const stocks = results.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
    }));

    return NextResponse.json({ results: stocks });
  } catch (error) {
    console.error('Stock search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
