import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { computePortfolioSignalsBundle } from '@/lib/portfolio/signals-engine';
import { buildAlgoTradeIntents } from '@/lib/algo/ai-trading-plan';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      maxInrPerTrade?: number;
      withAi?: boolean;
      strictConsensus?: boolean;
      minConsensusConviction?: number;
    };

    const maxInrPerTrade = Math.min(
      5_000_000,
      Math.max(1_000, Number(body.maxInrPerTrade) || 25_000)
    );
    const withAi = body.withAi !== false;
    const strictConsensus = body.strictConsensus === true;
    const minConsensusConviction = Number(body.minConsensusConviction);

    const serviceClient = createServiceRoleClient();
    const bundle = await computePortfolioSignalsBundle(userId, serviceClient, { withAi });
    const intents = buildAlgoTradeIntents(bundle, maxInrPerTrade, {
      strictConsensus,
      minConsensusConviction: Number.isFinite(minConsensusConviction)
        ? minConsensusConviction
        : undefined,
    });

    return NextResponse.json({
      intents,
      strictConsensus,
      minConsensusConviction: strictConsensus
        ? Number.isFinite(minConsensusConviction)
          ? minConsensusConviction
          : 60
        : undefined,
      generatedAt: bundle.generatedAt,
      ai: bundle.ai
        ? {
            portfolio_note: bundle.ai.portfolio_note,
            model: bundle.ai.model,
          }
        : null,
      aiError: bundle.aiError,
      risk: bundle.risk,
    });
  } catch (e) {
    console.error('Algo evaluate error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
