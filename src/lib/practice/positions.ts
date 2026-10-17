export const PRACTICE_STARTING_CASH = 100_000;
export const PRACTICE_MAX_QUANTITY = 100_000;

export interface PracticeTrade {
  id: string;
  symbol: string;
  exchange: 'NSE' | 'BSE';
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  created_at: string;
}

export interface PracticePosition {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  quantity: number;
  avgPrice: number;
  invested: number;
}

export interface PracticeBook {
  positions: PracticePosition[];
  /** Profit/loss already locked in by selling (average-cost method). */
  realizedPnl: number;
}

/** Replays trades oldest-first into open positions using average cost. */
export function buildPracticeBook(trades: PracticeTrade[]): PracticeBook {
  const ordered = [...trades].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const open = new Map<string, PracticePosition>();
  let realizedPnl = 0;

  for (const t of ordered) {
    const qty = Number(t.quantity);
    const price = Number(t.price);
    const pos = open.get(t.symbol) ?? {
      symbol: t.symbol,
      exchange: t.exchange,
      quantity: 0,
      avgPrice: 0,
      invested: 0,
    };

    if (t.side === 'buy') {
      pos.invested += qty * price;
      pos.quantity += qty;
      pos.avgPrice = pos.invested / pos.quantity;
    } else {
      const sold = Math.min(qty, pos.quantity);
      realizedPnl += sold * (price - pos.avgPrice);
      pos.quantity -= sold;
      pos.invested = pos.quantity * pos.avgPrice;
    }

    if (pos.quantity > 0) open.set(t.symbol, pos);
    else open.delete(t.symbol);
  }

  return {
    positions: [...open.values()].sort((a, b) => b.invested - a.invested),
    realizedPnl,
  };
}
