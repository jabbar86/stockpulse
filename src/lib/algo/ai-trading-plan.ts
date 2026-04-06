import type {
  PortfolioHoldingSignals,
  PortfolioSignalAIForecast,
  PortfolioSignalsAIResult,
  StockRecommendation,
  AlgoTradeIntent,
} from '@/types';
import type { PortfolioSignalsBundle } from '@/lib/portfolio/signals-engine';

function isExitLike(a: string): boolean {
  return a === 'sell' || a === 'exit';
}

function isBuyLike(a: string): boolean {
  return a === 'buy';
}

export interface BuildAlgoTradeIntentsOptions {
  /** Both rule + AI swing must agree and meet conviction floors; no rules-only / AI-only legs. */
  strictConsensus?: boolean;
  /** Minimum conviction on each of rule and AI when strictConsensus is true (default 60). */
  minConsensusConviction?: number;
}

function pickSwingStrict(
  rule: StockRecommendation | null,
  ai: PortfolioSignalAIForecast | null,
  minConv: number
): {
  side: 'buy' | 'sell' | 'hold';
  conviction: number;
  rationale: string;
  source: AlgoTradeIntent['source'];
} {
  if (!rule || !ai) {
    return {
      side: 'hold',
      conviction: 0,
      rationale:
        'Strict mode requires both rule-engine and AI swing signals. Enable AI or relax strict mode.',
      source: 'consensus',
    };
  }

  const ra = rule.action;
  const aa = ai.action;
  const rc = rule.conviction;
  const ac = ai.conviction;

  if (isBuyLike(ra) && isBuyLike(aa) && rc >= minConv && ac >= minConv) {
    return {
      side: 'buy',
      conviction: Math.round((rc + ac) / 2),
      rationale: `Strict consensus buy (both ≥${minConv}%): rule ${rc}%, AI ${ac}%. ${rule.reason?.slice(0, 100) ?? ''}`,
      source: 'consensus',
    };
  }

  if (isExitLike(ra) && isExitLike(aa) && rc >= minConv && ac >= minConv) {
    return {
      side: 'sell',
      conviction: Math.round((rc + ac) / 2),
      rationale: `Strict consensus exit (both ≥${minConv}%): rule ${rc}%, AI ${ac}%. ${rule.reason?.slice(0, 100) ?? ''}`,
      source: 'consensus',
    };
  }

  return {
    side: 'hold',
    conviction: Math.max(rc, ac),
    rationale: `Strict mode: no dual agreement at ≥${minConv}% on swing (rule ${ra} @${rc}%, AI ${aa} @${ac}%).`,
    source: 'consensus',
  };
}

function pickSwing(
  rule: StockRecommendation | null,
  ai: PortfolioSignalAIForecast | null
): {
  side: 'buy' | 'sell' | 'hold';
  conviction: number;
  rationale: string;
  source: AlgoTradeIntent['source'];
} {
  const ra = rule?.action ?? 'hold';
  const aa = ai?.action ?? 'hold';
  const rc = rule?.conviction ?? 0;
  const ac = ai?.conviction ?? 0;

  if (isBuyLike(ra) && isBuyLike(aa)) {
    return {
      side: 'buy',
      conviction: Math.round((rc + ac) / 2),
      rationale: `Rule + AI agree on accumulation (swing). Rule: ${rule?.reason?.slice(0, 120) ?? '—'}. AI: ${ai?.rationale?.slice(0, 120) ?? '—'}`,
      source: 'consensus',
    };
  }

  if (isExitLike(ra) && isExitLike(aa)) {
    return {
      side: 'sell',
      conviction: Math.round((rc + ac) / 2),
      rationale: `Rule + AI agree on trimming / exit (swing). Rule: ${rule?.reason?.slice(0, 120) ?? '—'}. AI: ${ai?.rationale?.slice(0, 120) ?? '—'}`,
      source: 'consensus',
    };
  }

  if (isBuyLike(ra) && rc >= 58) {
    return {
      side: 'buy',
      conviction: rc,
      rationale: `Rules-only swing buy (conviction ${rc}). ${rule?.reason ?? ''}`,
      source: 'rules',
    };
  }

  if (isBuyLike(aa) && ac >= 58) {
    return {
      side: 'buy',
      conviction: ac,
      rationale: `AI-only swing buy (conviction ${ac}). ${ai?.rationale ?? ''}`,
      source: 'ai',
    };
  }

  if (isExitLike(ra) && rc >= 52) {
    return {
      side: 'sell',
      conviction: rc,
      rationale: `Rules signal exit / sell (swing). ${rule?.reason ?? ''}`,
      source: 'rules',
    };
  }

  if (isExitLike(aa) && ac >= 52) {
    return {
      side: 'sell',
      conviction: ac,
      rationale: `AI suggests exit / sell (swing). ${ai?.rationale ?? ''}`,
      source: 'ai',
    };
  }

  return {
    side: 'hold',
    conviction: Math.max(rc, ac),
    rationale: 'No aligned swing signal between rules and AI — stand aside.',
    source: 'consensus',
  };
}

function qtyForBuy(maxInr: number, price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const q = Math.floor(maxInr / price);
  return Math.max(0, q);
}

function qtyForSell(holdingQty: number, side: 'sell'): number {
  if (holdingQty <= 0) return 0;
  if (side !== 'sell') return 0;
  const partial = Math.max(1, Math.floor(holdingQty * 0.25));
  return Math.min(holdingQty, partial);
}

function aiRowForSymbol(ai: PortfolioSignalsAIResult | null, symbol: string) {
  if (!ai?.holdings?.length) return null;
  return ai.holdings.find((h) => h.symbol.toUpperCase() === symbol.toUpperCase()) ?? null;
}

/**
 * Builds simulated trade intents from the portfolio signals bundle (rules + optional AI).
 * Uses **swing** horizon as the primary algo timeframe.
 */
export function buildAlgoTradeIntents(
  bundle: PortfolioSignalsBundle,
  maxInrPerTrade: number,
  options?: BuildAlgoTradeIntentsOptions
): AlgoTradeIntent[] {
  const maxInr = Math.min(5_000_000, Math.max(1_000, maxInrPerTrade));
  const strict = options?.strictConsensus === true;
  const minConv = Math.min(95, Math.max(40, Number(options?.minConsensusConviction) || 60));
  const out: AlgoTradeIntent[] = [];

  const posBySym = new Map(bundle.positions.map((p) => [p.symbol.toUpperCase(), p]));

  for (const h of bundle.holdings) {
    const pos = posBySym.get(h.symbol.toUpperCase());
    if (!pos) continue;

    const aiH = aiRowForSymbol(bundle.ai, h.symbol);
    const decision = strict
      ? pickSwingStrict(h.swing, aiH?.swing ?? null, minConv)
      : pickSwing(h.swing, aiH?.swing ?? null);

    const ref =
      h.swing?.entry && Number.isFinite(h.swing.entry) && h.swing.entry > 0
        ? h.swing.entry
        : pos.avg_price > 0
          ? pos.avg_price
          : 0;

    const sl = h.swing?.stop_loss;
    const tp = h.swing?.target;

    if (decision.side === 'hold') {
      out.push({
        symbol: h.symbol,
        name: h.name,
        side: 'hold',
        quantity: 0,
        reference_price: ref,
        stop_loss: sl,
        take_profit: tp,
        timeframe: 'swing',
        conviction: decision.conviction,
        rationale: decision.rationale,
        source: decision.source,
      });
      continue;
    }

    if (decision.side === 'buy') {
      const q = qtyForBuy(maxInr, ref);
      if (q <= 0 || ref <= 0) {
        out.push({
          symbol: h.symbol,
          name: h.name,
          side: 'hold',
          quantity: 0,
          reference_price: ref,
          stop_loss: sl,
          take_profit: tp,
          timeframe: 'swing',
          conviction: decision.conviction,
          rationale: `${decision.rationale} (No simulated size: invalid reference price or max trade too small.)`,
          source: decision.source,
        });
        continue;
      }
      out.push({
        symbol: h.symbol,
        name: h.name,
        side: 'buy',
        quantity: q,
        reference_price: ref,
        stop_loss: sl,
        take_profit: tp,
        timeframe: 'swing',
        conviction: decision.conviction,
        rationale: decision.rationale,
        source: decision.source,
      });
      continue;
    }

    const sellQty = qtyForSell(pos.quantity, 'sell');
    if (sellQty <= 0) {
      out.push({
        symbol: h.symbol,
        name: h.name,
        side: 'hold',
        quantity: 0,
        reference_price: ref,
        stop_loss: sl,
        take_profit: tp,
        timeframe: 'swing',
        conviction: decision.conviction,
        rationale: `${decision.rationale} (No shares to sell in paper book.)`,
        source: decision.source,
      });
      continue;
    }
    out.push({
      symbol: h.symbol,
      name: h.name,
      side: 'sell',
      quantity: sellQty,
      reference_price: ref,
      stop_loss: sl,
      take_profit: tp,
      timeframe: 'swing',
      conviction: decision.conviction,
      rationale: decision.rationale,
      source: decision.source,
    });
  }

  return out;
}
