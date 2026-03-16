import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getQuoteWithUpstox, getHistoricalData } from '@/lib/market-data/provider';
import { calculateTechnicalIndicators } from '@/lib/analysis/technical';
import { analyzeStock } from '@/lib/analysis/claude-analysis';
import { getCombinedRecommendation } from '@/lib/analysis/recommendation';
import type { CombinedAnalysis } from '@/types';
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

// POST /api/stocks/[symbol]/ai-analysis - trigger AI analysis
export async function POST(
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

    // Get user's analysis quota
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_premium, max_ai_analyses')
      .eq('id', userId)
      .single();

    const isPremium = profile?.is_premium === true;
    const maxAnalyses = profile?.max_ai_analyses ?? (isPremium ? 10 : 5);

    // Quota check: 5 total for free users, 10 total for premium
    const { count: analysisCount } = await serviceClient
      .from('analysis_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'ai')
      .eq('cached', false);

    if (analysisCount !== null && analysisCount >= maxAnalyses) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You have used all ${maxAnalyses} AI analyses.${!isPremium ? ' Upgrade to premium for more analyses.' : ''}`,
        },
        { status: 429 }
      );
    }

    // Check cache: 4hr during market hours, 24hr otherwise
    const cacheTtlMinutes = isMarketHours() ? 240 : 1440;
    const cacheThreshold = new Date(
      Date.now() - cacheTtlMinutes * 60 * 1000
    ).toISOString();

    const { data: cached } = await serviceClient
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
      await serviceClient.from('analysis_history').insert({
        user_id: userId,
        symbol: upperSymbol,
        type: 'ai',
        cached: true,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json(cached.data as CombinedAnalysis);
    }

    // Fetch quote and technical data
    const upstoxToken = await getUpstoxToken(userId);
    const [quote, historicalData] = await Promise.all([
      getQuoteWithUpstox(upperSymbol, upstoxToken),
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
    await serviceClient.from('analysis_cache').upsert(
      {
        symbol: upperSymbol,
        type: 'ai',
        data: combinedAnalysis,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'symbol,type' }
    );

    // Record in analysis_history
    await serviceClient.from('analysis_history').insert({
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
