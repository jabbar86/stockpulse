import type { StrategySignal, StockRecommendation } from '@/types';

function pickBestSignal(signals: StrategySignal[]): StrategySignal | null {
  if (!signals.length) return null;
  const sorted = [...signals].sort((a, b) => b.confidence - a.confidence);
  return sorted[0] ?? null;
}

export function buildStockRecommendation(
  symbol: string,
  name: string | undefined,
  signals: StrategySignal[]
): StockRecommendation | null {
  const best = pickBestSignal(signals);
  if (!best) {
    return null;
  }

  let action: StockRecommendation['action'] = 'hold';
  if (best.direction === 'buy') action = 'buy';
  else if (best.direction === 'sell') action = 'sell';
  else if (best.direction === 'exit') action = 'exit';

  return {
    symbol,
    name,
    timeframe: best.timeframe,
    action,
    conviction: best.confidence,
    entry: best.entry,
    stop_loss: best.stop_loss,
    target: best.target,
    reason: best.reason,
    source_signal: best.type,
    generated_at: best.generated_at,
  };
}

