import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { HoldingWithMetrics, PortfolioSummary } from '@/types';
import { getQuote } from '@/lib/market-data/provider';

// Validation schemas
const addHoldingSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  exchange: z.enum(['NSE', 'BSE']),
  quantity: z.number().positive(),
  avg_price: z.number().positive(),
  source: z.enum(['manual', 'upstox', 'zerodha']).default('manual'),
});

const updateHoldingSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().positive().optional(),
  avg_price: z.number().positive().optional(),
});

// GET /api/portfolio - fetch user holdings with live prices and portfolio summary
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data: holdings, error } = await supabase
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

    // Fetch live prices for all holdings
    const enrichedHoldings: HoldingWithMetrics[] = await Promise.all(
      holdings.map(async (holding) => {
        try {
          const quote = await getQuote(holding.symbol);
          const currentPrice = quote.price;
          const currentValue = currentPrice * holding.quantity;
          const investedValue = holding.avg_price * holding.quantity;
          const pnl = currentValue - investedValue;
          const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
          const dayChange = quote.change * holding.quantity;
          const dayChangePercent = quote.changePercent;

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
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

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

    const supabase = createServerClient();
    const { data, error } = await supabase
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
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

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

    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('holdings')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const { data, error } = await supabase
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
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Holding id is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('holdings')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const { error } = await supabase
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
