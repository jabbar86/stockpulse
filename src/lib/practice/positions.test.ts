import { describe, expect, it } from 'vitest';
import { buildPracticeBook, type PracticeTrade } from './positions';

let seq = 0;
function trade(side: 'buy' | 'sell', symbol: string, quantity: number, price: number): PracticeTrade {
  seq += 1;
  return {
    id: String(seq),
    symbol,
    exchange: 'NSE',
    side,
    quantity,
    price,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, seq)).toISOString(),
  };
}

describe('buildPracticeBook', () => {
  it('averages cost across multiple buys', () => {
    const book = buildPracticeBook([trade('buy', 'TCS', 10, 100), trade('buy', 'TCS', 10, 200)]);
    expect(book.positions).toHaveLength(1);
    expect(book.positions[0].quantity).toBe(20);
    expect(book.positions[0].avgPrice).toBe(150);
    expect(book.realizedPnl).toBe(0);
  });

  it('realises P&L against average cost on partial sell', () => {
    const book = buildPracticeBook([
      trade('buy', 'INFY', 10, 100),
      trade('buy', 'INFY', 10, 200),
      trade('sell', 'INFY', 5, 180),
    ]);
    expect(book.positions[0].quantity).toBe(15);
    expect(book.positions[0].avgPrice).toBe(150);
    expect(book.positions[0].invested).toBe(2250);
    expect(book.realizedPnl).toBe(150);
  });

  it('closes a position fully and records a loss', () => {
    const book = buildPracticeBook([trade('buy', 'SBIN', 4, 500), trade('sell', 'SBIN', 4, 450)]);
    expect(book.positions).toHaveLength(0);
    expect(book.realizedPnl).toBe(-200);
  });

  it('replays in time order regardless of input order', () => {
    const buy = trade('buy', 'ITC', 10, 400);
    const sell = trade('sell', 'ITC', 10, 420);
    const book = buildPracticeBook([sell, buy]);
    expect(book.positions).toHaveLength(0);
    expect(book.realizedPnl).toBe(200);
  });

  it('starts fresh average after a full exit', () => {
    const book = buildPracticeBook([
      trade('buy', 'HDFCBANK', 1, 1000),
      trade('sell', 'HDFCBANK', 1, 1100),
      trade('buy', 'HDFCBANK', 2, 900),
    ]);
    expect(book.positions[0].avgPrice).toBe(900);
    expect(book.realizedPnl).toBe(100);
  });
});
