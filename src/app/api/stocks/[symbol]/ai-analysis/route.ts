import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { getQuote, getHistoricalData } from '@/lib/market-data/provider';
import { calculateTechnicalIndicators } from '@/lib/analysis/technical';
import { analyzeStock } from '@/lib/analysis/claude-analysis';
import { getCombinedRecommendation } from '@/lib/analysis/recommendation';
import type { CombinedAnalysis } from '@/types';

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

// POST /api/stocks/[symbol]/ai-analysis - trigger AI analysis
export async function POST(
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

    // Rate limiting: max 10 AI analyses per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: analysisCount } = await supabase
      .from('analysis_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'ai')
      .gte('created_at', oneHourAgo);

    if (analysisCount !== null && analysisCount >= 10) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Maximum 10 AI analyses per hour. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Check cache: 4hr during market hours, 24hr otherwise
    const cacheTtlMinutes = isMarketHours() ? 240 : 1440;
    const cacheThreshold = new Date(
      Date.now() - cacheTtlMinutes * 60 * 1000
    ).toISOString();

    const { data: cached } = await supabase
      .from('analysis_cache')
      .select('*')
      .eq('symbol', upperSymbol)
      .eq('type', 'ai')
      .gte('created_at', cacheThreshold)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached?.data) {
      // Log in analysis_history even for cache hits
      await supabase.from('analysis_history').insert({
        user_id: userId,
        symbol: upperSymbol,
        type: 'ai',
        cached: true,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json(cached.data as CombinedAnalysis);
    }

    // Fetch quote and technical data
    const [quote, historicalData] = await Promise.all([
      getQuote(upperSymbol),
      getHistoricalData(upperSymbol, '1y'),
    ]);

    const technical = calculateTechnicalIndicators(historicalData);

    // Run AI analysis with Claude
    const aiAnalysis = await analyzeStock(
      upperSymbol,
      quote.name,
      quote,
      technical,
      historicalData,
    );

    // Get combined recommendation
    const { recommendation, confidence } = getCombinedRecommendation(
      technical,
      aiAnalysis
    );

    const combinedAnalysis: CombinedAnalysis = {
      symbol: upperSymbol,
      name: quote.name,
      current_price: quote.price,
      technical,
      ai: aiAnalysis,
      recommendation,
      confidence,
      analyzed_at: new Date().toISOString(),
    };

    // Cache AI analysis result
    await supabase.from('analysis_cache').upsert(
      {
        symbol: upperSymbol,
        type: 'ai',
        data: combinedAnalysis,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'symbol,type' }
    );

    // Record in analysis_history
    await supabase.from('analysis_history').insert({
      user_id: userId,
      symbol: upperSymbol,
      type: 'ai',
      cached: false,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(combinedAnalysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
