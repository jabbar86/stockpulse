import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { computePortfolioHealth } from '@/lib/analysis/portfolio-health';
import type { HoldingWithMetrics } from '@/types';

export const maxDuration = 30;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: holdings, error } = await serviceClient
      .from('holdings')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
    }

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({
        health: {
          score: 0,
          risk_tags: [],
          suggestions: [],
          sector_breakdown: [],
          concentration: { top_holding_weight: 0, top3_weight: 0 },
        },
      });
    }

    const enriched: HoldingWithMetrics[] = holdings.map((h) => {
      const investedValue = Number(h.avg_price) * Number(h.quantity);
      return {
        ...h,
        avg_price: Number(h.avg_price),
        quantity: Number(h.quantity),
        current_price: Number(h.avg_price),
        current_value: investedValue,
        invested_value: investedValue,
        pnl: 0,
        pnl_percent: 0,
        day_change: 0,
        day_change_percent: 0,
        allocation_percent: 0,
      };
    });

    const health = computePortfolioHealth(enriched);

    return NextResponse.json({ health });
  } catch (error) {
    console.error('Portfolio health error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

