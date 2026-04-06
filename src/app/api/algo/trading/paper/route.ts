import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { computePortfolioSignalsBundle } from '@/lib/portfolio/signals-engine';
import { buildAlgoTradeIntents } from '@/lib/algo/ai-trading-plan';
import { persistAlgoPaperTrades } from '@/lib/algo/persist-paper-trades';

export const maxDuration = 60;

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

    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 40)));

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from('algo_paper_trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Algo paper list error:', error);
      return NextResponse.json({ error: 'Failed to load paper trades' }, { status: 500 });
    }

    return NextResponse.json({ trades: data ?? [] });
  } catch (e) {
    console.error('Algo paper GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
      persist?: boolean;
      strictConsensus?: boolean;
      minConsensusConviction?: number;
    };

    const maxInrPerTrade = Math.min(
      5_000_000,
      Math.max(1_000, Number(body.maxInrPerTrade) || 25_000)
    );
    const withAi = body.withAi !== false;
    const persist = body.persist !== false;
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

    let inserted: string[] = [];

    if (persist) {
      inserted = await persistAlgoPaperTrades(serviceClient, userId, bundle, intents, {
        strictConsensus,
        minConsensusConviction: strictConsensus ? (Number.isFinite(minConsensusConviction) ? minConsensusConviction : 60) : undefined,
      });
    }

    return NextResponse.json({
      intents,
      strictConsensus,
      minConsensusConviction: strictConsensus
        ? Number.isFinite(minConsensusConviction)
          ? minConsensusConviction
          : 60
        : undefined,
      generatedAt: bundle.generatedAt,
      persistedIds: inserted,
      ai: bundle.ai
        ? { portfolio_note: bundle.ai.portfolio_note, model: bundle.ai.model }
        : null,
      aiError: bundle.aiError,
    });
  } catch (e) {
    console.error('Algo paper POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
