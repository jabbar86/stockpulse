import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseRiskMode,
  getTimeframeRecommendationsForSymbol,
  type RiskFixedBundle,
  type TimeframeRiskModes,
} from '@/lib/recommendations/for-symbol';
import { enrichPortfolioSignalsWithAI } from '@/lib/analysis/portfolio-signals-ai';
import type { PortfolioHoldingSignals, PortfolioSignalsAIResult, StockRecommendation } from '@/types';

const DEFAULT_MAX_HOLDINGS = 30;

/** Run async tasks with limited concurrency (avoid hammering market data). */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export interface PortfolioSignalsEngineOptions {
  maxHoldings?: number;
  modes?: TimeframeRiskModes;
  fixed?: RiskFixedBundle;
  withAi?: boolean;
  concurrency?: number;
}

export interface PortfolioSignalsBundle {
  positions: { symbol: string; name: string; quantity: number; avg_price: number }[];
  holdings: PortfolioHoldingSignals[];
  intraday: StockRecommendation[];
  swing: StockRecommendation[];
  long_term: StockRecommendation[];
  common: StockRecommendation[];
  generatedAt: string;
  risk: {
    intraday: { mode: TimeframeRiskModes['intraday']; fixed: RiskFixedBundle['intraday'] };
    swing: { mode: TimeframeRiskModes['swing']; fixed: RiskFixedBundle['swing'] };
    long_term: { mode: TimeframeRiskModes['long_term']; fixed: RiskFixedBundle['long_term'] };
  };
  ai: PortfolioSignalsAIResult | null;
  aiError?: string;
}

const defaultModes: TimeframeRiskModes = {
  intraday: parseRiskMode(null, 'atr'),
  swing: parseRiskMode(null, 'atr'),
  long_term: parseRiskMode(null, 'atr'),
};

const defaultFixed: RiskFixedBundle = {
  intraday: { slPct: 0.8, tpPct: 1.6 },
  swing: { slPct: 5, tpPct: 10 },
  long_term: { slPct: 10, tpPct: 20 },
};

/**
 * Computes rule-based timeframe signals per holding and optional AI synthesis.
 */
export async function computePortfolioSignalsBundle(
  userId: string,
  serviceClient: SupabaseClient,
  options: PortfolioSignalsEngineOptions = {}
): Promise<PortfolioSignalsBundle> {
  const maxHoldings = options.maxHoldings ?? DEFAULT_MAX_HOLDINGS;
  const modes = options.modes ?? defaultModes;
  const fixed = options.fixed ?? defaultFixed;
  const withAi = options.withAi ?? true;
  const concurrency = options.concurrency ?? 4;

  const { data: rows, error } = await serviceClient
    .from('holdings')
    .select('symbol, name, quantity, avg_price')
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to fetch holdings');
  }

  const emptyRisk = {
    intraday: { mode: modes.intraday, fixed: fixed.intraday },
    swing: { mode: modes.swing, fixed: fixed.swing },
    long_term: { mode: modes.long_term, fixed: fixed.long_term },
  };

  if (!rows?.length) {
    return {
      positions: [],
      holdings: [],
      intraday: [],
      swing: [],
      long_term: [],
      common: [],
      generatedAt: new Date().toISOString(),
      risk: emptyRisk,
      ai: null,
    };
  }

  const seen = new Set<string>();
  const positions: { symbol: string; name: string; quantity: number; avg_price: number }[] = [];
  for (const h of rows) {
    const sym = String(h.symbol || '').trim().toUpperCase();
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    positions.push({
      symbol: sym,
      name: (h.name && String(h.name).trim()) || sym,
      quantity: Number(h.quantity) || 0,
      avg_price: Number(h.avg_price) || 0,
    });
  }

  const slice = positions.slice(0, maxHoldings);

  const perHolding = await mapPool(slice, concurrency, async (h) => {
    const r = await getTimeframeRecommendationsForSymbol(h.symbol, h.name, modes, fixed);
    return {
      symbol: h.symbol,
      name: h.name,
      intraday: r.intraday,
      swing: r.swing,
      long_term: r.long_term,
      common: r.common,
    } satisfies PortfolioHoldingSignals;
  });

  let aiPayload: Awaited<ReturnType<typeof enrichPortfolioSignalsWithAI>> | null = null;
  if (withAi && perHolding.length > 0) {
    aiPayload = await enrichPortfolioSignalsWithAI(
      userId,
      slice.map((p) => ({
        symbol: p.symbol,
        name: p.name,
        quantity: p.quantity,
        avg_price: p.avg_price,
      })),
      perHolding
    );
  }

  const intraday: StockRecommendation[] = [];
  const swing: StockRecommendation[] = [];
  const long_term: StockRecommendation[] = [];
  const common: StockRecommendation[] = [];

  for (const row of perHolding) {
    if (row.intraday) intraday.push(row.intraday);
    if (row.swing) swing.push(row.swing);
    if (row.long_term) long_term.push(row.long_term);
    if (row.common) common.push(row.common);
  }

  const sortByConviction = (a: StockRecommendation, b: StockRecommendation) =>
    b.conviction - a.conviction;

  return {
    positions: slice,
    holdings: perHolding,
    intraday: [...intraday].sort(sortByConviction),
    swing: [...swing].sort(sortByConviction),
    long_term: [...long_term].sort(sortByConviction),
    common: [...common].sort(sortByConviction),
    generatedAt: new Date().toISOString(),
    risk: emptyRisk,
    ai: aiPayload?.ai ?? null,
    aiError: aiPayload?.aiError,
  };
}
