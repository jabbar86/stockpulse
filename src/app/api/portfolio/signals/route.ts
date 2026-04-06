import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  parseRiskMode,
  type RiskFixedBundle,
  type TimeframeRiskModes,
} from '@/lib/recommendations/for-symbol';
import { computePortfolioSignalsBundle } from '@/lib/portfolio/signals-engine';
import type { PortfolioHoldingSignals } from '@/types';

export const maxDuration = 60;

function parseFixedBundle(url: URL): RiskFixedBundle {
  return {
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
}

function parseModes(url: URL): TimeframeRiskModes {
  return {
    intraday: parseRiskMode(url.searchParams.get('intradayRisk'), 'atr'),
    swing: parseRiskMode(url.searchParams.get('swingRisk'), 'atr'),
    long_term: parseRiskMode(url.searchParams.get('longRisk'), 'atr'),
  };
}

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
    const modes = parseModes(url);
    const fixed = parseFixedBundle(url);
    const withAi = url.searchParams.get('ai') !== '0';

    const serviceClient = createServiceRoleClient();
    const bundle = await computePortfolioSignalsBundle(userId, serviceClient, {
      modes,
      fixed,
      withAi,
    });

    if (bundle.holdings.length === 0 && bundle.positions.length === 0) {
      return NextResponse.json({
        holdings: [] as PortfolioHoldingSignals[],
        intraday: [],
        swing: [],
        long_term: [],
        common: [],
        generatedAt: bundle.generatedAt,
        risk: bundle.risk,
        ai: null,
      });
    }

    return NextResponse.json({
      holdings: bundle.holdings,
      intraday: bundle.intraday,
      swing: bundle.swing,
      long_term: bundle.long_term,
      common: bundle.common,
      generatedAt: bundle.generatedAt,
      holdingsCount: bundle.holdings.length,
      risk: bundle.risk,
      ai: bundle.ai,
      aiError: bundle.aiError,
    });
  } catch (error) {
    console.error('Portfolio signals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
