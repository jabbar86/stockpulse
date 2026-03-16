import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getQuoteWithUpstox, getHistoricalData } from '@/lib/market-data/provider';
import { calculateTechnicalIndicators } from '@/lib/analysis/technical';
import { getUpstoxToken } from '@/lib/brokers/upstox-token';

/**
 * Check if Indian stock market is currently in trading hours.
 * Market hours: Mon-Fri 9:15 AM - 3:30 PM IST (UTC+5:30)
 */
function isMarketHours(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);

  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;

  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  return totalMinutes >= 555 && totalMinutes <= 930;
}

// GET /api/stocks/[symbol]/analysis - fetch quote and technical indicators
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const upperSymbol = symbol.toUpperCase();
    const serviceClient = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange') || undefined;

    // Check cache first
    const ttlMinutes = isMarketHours() ? 30 : 1440;
    const cacheThreshold = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString();

    const { data: cached } = await serviceClient
      .from('analysis_cache')
      .select('*')
      .eq('symbol', upperSymbol)
      .eq('type', 'technical')
      .gte('created_at', cacheThreshold)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached?.data) {
      const { quote, technical } = cached.data as any;
      return NextResponse.json({
        symbol: upperSymbol,
        name: quote.name,
        current_price: quote.price,
        quote,
        technical,
        recommendation: technical.overallSignal,
        confidence: Math.abs(technical.score),
        analyzed_at: cached.created_at,
      });
    }

    // Cache miss — fetch quote and historical data in parallel
    const upstoxToken = await getUpstoxToken(userId);
    const [quote, historicalForTechnical] = await Promise.all([
      getQuoteWithUpstox(upperSymbol, upstoxToken, exchange),
      getHistoricalData(upperSymbol, '1y', exchange),
    ]);

    const technical = calculateTechnicalIndicators(historicalForTechnical);

    // Cache the result (don't await — fire and forget)
    serviceClient.from('analysis_cache').upsert(
      {
        symbol: upperSymbol,
        type: 'technical',
        data: { quote, technical },
        created_at: new Date().toISOString(),
      },
      { onConflict: 'symbol,type' }
    ).then(() => {});

    return NextResponse.json({
      symbol: upperSymbol,
      name: quote.name,
      current_price: quote.price,
      quote,
      technical,
      recommendation: technical.overallSignal,
      confidence: Math.abs(technical.score),
      analyzed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stock analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
