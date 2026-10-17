import { describe, expect, it } from 'vitest';
import { alertNotificationText, evaluateAlert } from './price-alerts';

describe('evaluateAlert', () => {
  it('triggers "above" at or over target', () => {
    expect(evaluateAlert({ direction: 'above', target_price: 100 }, 99.99)).toBe(false);
    expect(evaluateAlert({ direction: 'above', target_price: 100 }, 100)).toBe(true);
    expect(evaluateAlert({ direction: 'above', target_price: 100 }, 120)).toBe(true);
  });

  it('triggers "below" at or under target', () => {
    expect(evaluateAlert({ direction: 'below', target_price: 100 }, 100.01)).toBe(false);
    expect(evaluateAlert({ direction: 'below', target_price: 100 }, 100)).toBe(true);
    expect(evaluateAlert({ direction: 'below', target_price: 100 }, 80)).toBe(true);
  });

  it('accepts numeric strings from Postgres numeric columns', () => {
    expect(evaluateAlert({ direction: 'above', target_price: '100' as unknown as number }, 101)).toBe(true);
  });

  it('ignores missing or invalid prices', () => {
    expect(evaluateAlert({ direction: 'below', target_price: 100 }, 0)).toBe(false);
    expect(evaluateAlert({ direction: 'below', target_price: 100 }, NaN)).toBe(false);
  });
});

describe('alertNotificationText', () => {
  it('describes the crossing and includes the note', () => {
    const t = alertNotificationText(
      { symbol: 'RELIANCE', direction: 'below', target_price: 2500, note: 'buy zone' },
      2490.5
    );
    expect(t.title).toBe('RELIANCE fell below ₹2,500');
    expect(t.body).toContain('₹2,490.5');
    expect(t.body).toContain('buy zone');
  });
});
