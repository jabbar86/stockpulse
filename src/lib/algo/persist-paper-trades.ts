import type { SupabaseClient } from '@supabase/supabase-js';
import type { AlgoTradeIntent } from '@/types';
import type { PortfolioSignalsBundle } from '@/lib/portfolio/signals-engine';

/**
 * Inserts actionable paper legs (non-hold, qty &gt; 0). Returns created row ids.
 */
export async function persistAlgoPaperTrades(
  serviceClient: SupabaseClient,
  userId: string,
  bundle: PortfolioSignalsBundle,
  intents: AlgoTradeIntent[],
  snapshotExtra?: Record<string, unknown>
): Promise<string[]> {
  const inserted: string[] = [];
  const actionable = intents.filter((i) => i.side !== 'hold' && i.quantity > 0);

  for (const i of actionable) {
    const { data, error } = await serviceClient
      .from('algo_paper_trades')
      .insert({
        user_id: userId,
        symbol: i.symbol,
        exchange: 'NSE',
        side: i.side,
        timeframe: i.timeframe,
        quantity: i.quantity,
        conviction: i.conviction,
        reference_price: i.reference_price,
        stop_loss: i.stop_loss ?? null,
        take_profit: i.take_profit ?? null,
        rationale: i.rationale,
        source: i.source,
        signals_snapshot: {
          name: i.name,
          generatedAt: bundle.generatedAt,
          ai_note: bundle.ai?.portfolio_note ?? null,
          model: bundle.ai?.model ?? null,
          ...snapshotExtra,
        },
      })
      .select('id')
      .single();

    if (!error && data?.id) inserted.push(data.id);
  }

  return inserted;
}
