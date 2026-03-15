import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { getQuote } from '@/lib/market-data/provider';
import { analyzePortfolio } from '@/lib/analysis/claude-analysis';
import type { HoldingWithMetrics } from '@/types';

// POST /api/analysis/portfolio - analyze entire portfolio (diversification, risk, rebalancing)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Fetch all user holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId);

    if (holdingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch holdings' },
        { status: 500 }
      );
    }

    if (!holdings || holdings.length === 0) {
      return NextResponse.json(
        { error: 'No holdings found. Add stocks to your portfolio first.' },
        { status: 400 }
      );
    }

    // Enrich holdings with current prices
    const enrichedHoldings: HoldingWithMetrics[] = await Promise.all(
      holdings.map(async (holding) => {
        try {
          const quote = await getQuote(holding.symbol);
          const currentPrice = quote.price;
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
            day_change: quote.change * holding.quantity,
            day_change_percent: quote.changePercent,
          };
        } catch {
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

    // Calculate total portfolio value for allocation percentages
    const totalValue = enrichedHoldings.reduce((sum, h) => sum + h.current_value, 0);
    const holdingsWithAllocation = enrichedHoldings.map((h) => ({
      ...h,
      allocation_percent: totalValue > 0 ? (h.current_value / totalValue) * 100 : 0,
    }));

    // Portfolio-level metrics
    const totalInvested = holdingsWithAllocation.reduce(
      (sum, h) => sum + h.invested_value,
      0
    );

    const portfolioContext = {
      holdings: holdingsWithAllocation,
      total_value: totalValue,
      total_invested: totalInvested,
      total_pnl: totalValue - totalInvested,
      total_pnl_percent:
        totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
      holdings_count: holdingsWithAllocation.length,
    };

    // Run portfolio analysis with Claude
    const analysis = await analyzePortfolio(holdingsWithAllocation);

    return NextResponse.json({
      portfolio: portfolioContext,
      analysis,
      analyzed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
