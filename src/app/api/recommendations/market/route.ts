import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NIFTY_50, NIFTY_100 } from '@/lib/market-data/universe';
import {
  parseRiskMode,
  topN,
  getTimeframeRecommendationsForSymbol,
  type RiskFixedBundle,
  type TimeframeRiskModes,
} from '@/lib/recommendations/for-symbol';
import type { StockRecommendation } from '@/types';

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
    const limit = Math.max(1, Math.min(25, Number(url.searchParams.get('limit') || 8)));

    const universe = (url.searchParams.get('universe') || 'nifty50').toLowerCase();
    const symbols = universe === 'nifty100' ? NIFTY_100 : NIFTY_50;

    const intradayMode = parseRiskMode(url.searchParams.get('intradayRisk'), 'atr');
    const swingMode = parseRiskMode(url.searchParams.get('swingRisk'), 'atr');
    const longMode = parseRiskMode(url.searchParams.get('longRisk'), 'atr');

    const fixed: RiskFixedBundle = {
      intraday: {
        slPct: Number(url.searchParams.get('intradaySlPct') || 0.8),
        tpPct: Number(url.searchParams.get('intradayTpPct') || 1.6),
      },
      swing: {
        slPct: Number(url.searchParams.get('swingSlPct') || 5),
        tpPct: Number(url.searchParams.get('swingTpPct') || 10),
      },
      long_term: {
        slPct: Number(url.searchParams.get('longSlPct') || 10),
        tpPct: Number(url.searchParams.get('longTpPct') || 20),
      },
    };

    const modes: TimeframeRiskModes = {
      intraday: intradayMode,
      swing: swingMode,
      long_term: longMode,
    };

    const intraday: StockRecommendation[] = [];
    const swing: StockRecommendation[] = [];
    const positional: StockRecommendation[] = [];
    const common: StockRecommendation[] = [];

    for (const symbol of symbols) {
      const name = symbol;
      try {
        const r = await getTimeframeRecommendationsForSymbol(symbol, name, modes, fixed);
        if (r.intraday) intraday.push(r.intraday);
        if (r.swing) swing.push(r.swing);
        if (r.long_term) positional.push(r.long_term);
        if (r.common) common.push(r.common);
      } catch {
        // ignore single-symbol failures
      }
    }

    return NextResponse.json({
      intraday: topN(intraday, limit),
      swing: topN(swing, limit),
      long_term: topN(positional, limit),
      common: topN(common, limit),
      generatedAt: new Date().toISOString(),
      universe,
      universeSize: symbols.length,
      risk: {
        intraday: { mode: intradayMode, fixed: fixed.intraday },
        swing: { mode: swingMode, fixed: fixed.swing },
        long_term: { mode: longMode, fixed: fixed.long_term },
      },
    });
  } catch (error) {
    console.error('Market recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
