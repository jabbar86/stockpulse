import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { HoldingWithMetrics, PortfolioSummary } from '@/types';
import { getQuote } from '@/lib/market-data/provider';
import { getUpstoxToken } from '@/lib/brokers/upstox-token';
import { getUpstoxLTP } from '@/lib/market-data/upstox-provider';

// Validation schemas
const addHoldingSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  exchange: z.enum(['NSE', 'BSE']),
  quantity: z.number().positive(),
  avg_price: z.number().positive(),
  source: z.enum(['manual', 'upstox', 'angelone', 'fyers', 'csv']).default('manual'),
});

const updateHoldingSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().positive().optional(),
  avg_price: z.number().positive().optional(),
});

// GET /api/portfolio - fetch user holdings with live prices and portfolio summary
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: holdings, error } = await serviceClient
      .from('holdings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
    }

    if (!holdings || holdings.length === 0) {
      const emptySummary: PortfolioSummary = {
        total_invested: 0,
        current_value: 0,
        total_pnl: 0,
        total_pnl_percent: 0,
        day_change: 0,
        day_change_percent: 0,
        holdings_count: 0,
        top_gainers: [],
        top_losers: [],
      };
      return NextResponse.json({ holdings: [], summary: emptySummary });
    }

    // Try batch Upstox LTP if user has a connected Upstox account
    const upstoxToken = await getUpstoxToken(userId);
    let upstoxPrices: Map<string, { price: number; change: number; changePercent: number }> | null = null;

    if (upstoxToken) {
      try {
        const symbols = holdings.map((h) => h.symbol);
        upstoxPrices = await getUpstoxLTP(symbols, upstoxToken);
      } catch (error) {
        console.warn('Upstox batch LTP failed, falling back to Yahoo:', error);
      }
    }

    // Fetch live prices for all holdings
    const enrichedHoldings: HoldingWithMetrics[] = await Promise.all(
      holdings.map(async (holding) => {
        try {
          let currentPrice: number;
          let dayChange: number;
          let dayChangePercent: number;

          const upstoxData = upstoxPrices?.get(holding.symbol.toUpperCase());
          if (upstoxData) {
            currentPrice = upstoxData.price;
            dayChange = upstoxData.change * holding.quantity;
            dayChangePercent = upstoxData.changePercent;
          } else {
            const quote = await getQuote(holding.symbol);
            currentPrice = quote.price;
            dayChange = quote.change * holding.quantity;
            dayChangePercent = quote.changePercent;
          }

          const currentValue = currentPrice * holding.quantity;
          const investedValue = holding.avg_price * holding.quantity;
          const pnl = currentValue - investedValue;
          const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

          return {
            ...holding,
            current_price: currentPrice,
            current_value: currentValue,
            invested_value: investedValue,
            pnl,
            pnl_percent: pnlPercent,
            day_change: dayChange,
            day_change_percent: dayChangePercent,
          };
        } catch {
          // If quote fetch fails, use avg_price as fallback
          const investedValue = holding.avg_price * holding.quantity;
          return {
            ...holding,
            current_price: holding.avg_price,
            current_value: investedValue,
            invested_value: investedValue,
            pnl: 0,
            pnl_percent: 0,
            day_change: 0,
            day_change_percent: 0,
          };
        }
      })
    );

    // Calculate portfolio summary
    const totalInvested = enrichedHoldings.reduce((sum, h) => sum + h.invested_value, 0);
    const currentValue = enrichedHoldings.reduce((sum, h) => sum + h.current_value, 0);
    const totalPnl = currentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const dayChange = enrichedHoldings.reduce((sum, h) => sum + h.day_change, 0);
    const dayChangePercent =
      totalInvested > 0 ? (dayChange / totalInvested) * 100 : 0;

    // Add allocation percentages
    const holdingsWithAllocation = enrichedHoldings.map((h) => ({
      ...h,
      allocation_percent: currentValue > 0 ? (h.current_value / currentValue) * 100 : 0,
    }));

    // Sort for top gainers and losers
    const sorted = [...holdingsWithAllocation].sort((a, b) => b.pnl_percent - a.pnl_percent);
    const topGainers = sorted.filter((h) => h.pnl_percent > 0).slice(0, 5);
    const topLosers = sorted.filter((h) => h.pnl_percent < 0).reverse().slice(0, 5);

    const summary: PortfolioSummary = {
      total_invested: totalInvested,
      current_value: currentValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      day_change: dayChange,
      day_change_percent: dayChangePercent,
      holdings_count: holdingsWithAllocation.length,
      top_gainers: topGainers,
      top_losers: topLosers,
    };

    return NextResponse.json({ holdings: holdingsWithAllocation, summary });
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/portfolio - add a new holding
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addHoldingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from('holdings')
      .insert({
        user_id: userId,
        symbol: parsed.data.symbol,
        name: parsed.data.name,
        exchange: parsed.data.exchange,
        quantity: parsed.data.quantity,
        avg_price: parsed.data.avg_price,
        source: parsed.data.source,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert holding error:', error);
      return NextResponse.json({ error: 'Failed to add holding' }, { status: 500 });
    }

    return NextResponse.json({ holding: data }, { status: 201 });
  } catch (error) {
    console.error('Portfolio POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/portfolio - update a holding
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateHoldingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Verify ownership
    const { data: existing } = await serviceClient
      .from('holdings')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const { data, error } = await serviceClient
      .from('holdings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update holding error:', error);
      return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 });
    }

    return NextResponse.json({ holding: data });
  } catch (error) {
    console.error('Portfolio PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/portfolio?id=xxx - delete a holding
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: 'Holding id is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Verify ownership
    const { data: existing } = await serviceClient
      .from('holdings')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const { error } = await serviceClient
      .from('holdings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete holding error:', error);
      return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portfolio DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
