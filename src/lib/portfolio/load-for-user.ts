import { createServiceRoleClient } from '@/lib/supabase/server';
import type { HoldingWithMetrics, PortfolioSummary } from '@/types';

export type PortfolioPayload = {
  holdings: HoldingWithMetrics[];
  summary: PortfolioSummary;
};

/**
 * Loads holdings + summary for a user (same shape as GET /api/portfolio).
 * Used by portfolio route and Today bootstrap to avoid duplicate DB logic.
 */
export async function loadPortfolioForUserId(userId: string): Promise<
  { ok: true; data: PortfolioPayload } | { ok: false; error: string }
> {
  const serviceClient = createServiceRoleClient();
  const { data: holdings, error } = await serviceClient
    .from('holdings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: 'Failed to fetch holdings' };
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
    return { ok: true, data: { holdings: [], summary: emptySummary } };
  }

  const totalInvested = holdings.reduce((sum, h) => sum + h.avg_price * h.quantity, 0);

  const enrichedHoldings: HoldingWithMetrics[] = holdings.map((h) => {
    const investedValue = h.avg_price * h.quantity;
    return {
      ...h,
      current_price: h.avg_price,
      current_value: investedValue,
      invested_value: investedValue,
      pnl: 0,
      pnl_percent: 0,
      day_change: 0,
      day_change_percent: 0,
      allocation_percent: totalInvested > 0 ? (investedValue / totalInvested) * 100 : 0,
    };
  });

  const summary: PortfolioSummary = {
    total_invested: totalInvested,
    current_value: totalInvested,
    total_pnl: 0,
    total_pnl_percent: 0,
    day_change: 0,
    day_change_percent: 0,
    holdings_count: holdings.length,
    top_gainers: [],
    top_losers: [],
  };

  return { ok: true, data: { holdings: enrichedHoldings, summary } };
}
