import { describe, expect, it } from 'vitest';
import { estimateCapitalGains, longTermStartDate, type TaxHoldingInput } from './capital-gains';

const TODAY = new Date('2026-10-18T06:00:00Z');

function h(symbol: string, buy: string | null, avg: number, cur: number, qty = 1): TaxHoldingInput {
  return {
    symbol,
    quantity: qty,
    avg_price: avg,
    current_price: cur,
    buy_date: buy,
    created_at: '2026-01-01T10:00:00Z',
  };
}

describe('longTermStartDate', () => {
  it('is the day after the 12-month anniversary', () => {
    expect(longTermStartDate(new Date('2024-03-15T00:00:00Z')).toISOString().slice(0, 10)).toBe('2025-03-16');
  });
  it('clamps leap day', () => {
    expect(longTermStartDate(new Date('2024-02-29T00:00:00Z')).toISOString().slice(0, 10)).toBe('2025-03-01');
  });
});

describe('estimateCapitalGains', () => {
  it('classifies exactly 12 months as short-term and the next day as long-term', () => {
    const r = estimateCapitalGains([h('A', '2025-10-18', 100, 110), h('B', '2025-10-17', 100, 110)], TODAY);
    expect(r.rows[0]).toMatchObject({ term: 'short', daysToLongTerm: 1 });
    expect(r.rows[1]).toMatchObject({ term: 'long', daysToLongTerm: 0 });
  });

  it('applies the LTCG exemption, rates and cess', () => {
    // LT gain 2,25,000 → taxable 1,00,000 @12.5% = 12,500; ST gain 50,000 @20% = 10,000
    const r = estimateCapitalGains(
      [h('LT', '2023-01-01', 100, 325, 1000), h('ST', '2026-06-01', 100, 150, 1000)],
      TODAY
    );
    expect(r.exemptionUsed).toBe(125000);
    expect(r.ltcgTax).toBe(12500);
    expect(r.stcgTax).toBe(10000);
    expect(r.cess).toBe(900);
    expect(r.totalTax).toBe(23400);
  });

  it('sets ST losses off against ST then LT gains; LT losses only against LT', () => {
    const r = estimateCapitalGains(
      [
        h('STG', '2026-06-01', 100, 120, 1000), // +20,000 ST
        h('STL', '2026-06-01', 100, 50, 1000), // -50,000 ST
        h('LTG', '2023-01-01', 100, 400, 1000), // +3,00,000 LT
      ],
      TODAY
    );
    expect(r.netShortTerm).toBe(0);
    expect(r.netLongTerm).toBe(270000);

    const ltLossOnly = estimateCapitalGains(
      [h('STG', '2026-06-01', 100, 120, 1000), h('LTL', '2023-01-01', 100, 50, 1000)],
      TODAY
    );
    expect(ltLossOnly.netShortTerm).toBe(20000);
    expect(ltLossOnly.stcgTax).toBe(4000);
  });

  it('falls back to created_at and flags harvesting / near-LTCG holdings', () => {
    const r = estimateCapitalGains(
      [h('NOBUY', null, 100, 90), h('SOON', '2025-11-20', 100, 200), h('FAR', '2026-09-01', 100, 200)],
      TODAY
    );
    expect(r.missingBuyDates).toBe(1);
    expect(r.rows[0]).toMatchObject({ heldSince: '2026-01-01', dateEstimated: true });
    expect(r.harvestCandidates.map((x) => x.symbol)).toEqual(['NOBUY']);
    expect(r.nearLongTerm.map((x) => x.symbol)).toEqual(['SOON']);
  });
});
