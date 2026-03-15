import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { getQuote, getHistoricalData } from '@/lib/market-data/provider';
import { calculateTechnicalIndicators } from '@/lib/analysis/technical';

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
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await params;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const upperSymbol = symbol.toUpperCase();
    const supabase = createServerClient();

    // Check cache first
    const ttlMinutes = isMarketHours() ? 30 : 1440; // 30 min during market, 24hr otherwise
    const cacheThreshold = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString();

    const { data: cached } = await supabase
      .from('analysis_cache')
      .select('*')
      .eq('symbol', upperSymbol)
      .eq('type', 'technical')
      .gte('created_at', cacheThreshold)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached?.data) {
      return NextResponse.json(cached.data);
    }

    // Fetch fresh data
    const [quote, historicalData] = await Promise.all([
      getQuote(upperSymbol),
      getHistoricalData(upperSymbol, '1y'),
    ]);

    // Calculate technical indicators
    const technical = calculateTechnicalIndicators(historicalData);

    const result = {
      quote,
      technical,
      historicalData,
    };

    // Cache the result
    await supabase.from('analysis_cache').upsert(
      {
        symbol: upperSymbol,
        type: 'technical',
        data: result,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'symbol,type' }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stock analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
