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

  // Convert to IST
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);

  const day = ist.getUTCDay();
  // Weekend check (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) return false;

  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Market hours: 9:15 (555 min) to 15:30 (930 min)
  return totalMinutes >= 555 && totalMinutes <= 930;
}

// GET /api/stocks/[symbol]/analysis - fetch quote, historical data, and technical indicators
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

    // Map UI period to yahoo-finance period
    const { searchParams } = new URL(request.url);
    const uiPeriod = searchParams.get('period') || '3M';
    const periodMap: Record<string, '1mo' | '3mo' | '6mo' | '1y'> = {
      '1M': '1mo',
      '3M': '3mo',
      '6M': '6mo',
      '1Y': '1y',
    };
    const yahooPeriod = periodMap[uiPeriod] || '3mo';

    // Check cache first (only for quote + technical, not historical which varies by period)
    const ttlMinutes = isMarketHours() ? 30 : 1440;
    const cacheThreshold = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString();

    let quote;
    let technical;

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
      quote = (cached.data as any).quote;
      technical = (cached.data as any).technical;
    }

    // Fetch fresh quote + technical if not cached
    if (!quote || !technical) {
      const upstoxToken = await getUpstoxToken(userId);
      const historicalForTechnical = await getHistoricalData(upperSymbol, '1y');
      quote = await getQuoteWithUpstox(upperSymbol, upstoxToken);
      technical = calculateTechnicalIndicators(historicalForTechnical);

      // Cache the technical data
      await serviceClient.from('analysis_cache').upsert(
        {
          symbol: upperSymbol,
          type: 'technical',
          data: { quote, technical },
          created_at: new Date().toISOString(),
        },
        { onConflict: 'symbol,type' }
      );
    }

    // Always fetch historical data for the requested period (not cached since period varies)
    const historicalData = await getHistoricalData(upperSymbol, yahooPeriod);

    // Return in the CombinedAnalysis-like shape the frontend expects
    const result = {
      symbol: upperSymbol,
      name: quote.name,
      current_price: quote.price,
      quote,
      technical,
      historicalData,
      recommendation: technical.overallSignal,
      confidence: Math.abs(technical.score),
      analyzed_at: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stock analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
