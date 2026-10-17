import { describe, expect, it } from 'vitest';
import { lumpsum, sip, stepUpSip } from './sip';
import { calculateCharges, CHARGE_RATES } from './charges';
import { calculatePositionSize, type PositionSizeResult } from './position-size';

describe('sip', () => {
  it('matches the standard annuity-due SIP formula', () => {
    const r = sip(10_000, 12, 10);
    expect(r.invested).toBe(1_200_000);
    // 10000 * ((1.01^120 - 1) / 0.01) * 1.01
    const expected = 10_000 * ((Math.pow(1.01, 120) - 1) / 0.01) * 1.01;
    expect(r.maturity).toBeCloseTo(expected, 4);
    expect(Math.round(r.maturity)).toBe(2_323_391);
    expect(r.returns).toBeCloseTo(r.maturity - r.invested, 6);
  });

  it('returns one yearly row per year, ending at maturity', () => {
    const r = sip(5_000, 10, 5);
    expect(r.yearly).toHaveLength(5);
    expect(r.yearly[0]).toMatchObject({ year: 1, invested: 60_000 });
    expect(r.yearly[4].value).toBeCloseTo(r.maturity, 6);
    for (let k = 1; k < r.yearly.length; k++) {
      expect(r.yearly[k].value).toBeGreaterThan(r.yearly[k - 1].value);
    }
  });

  it('with 0% return maturity equals invested', () => {
    const r = sip(1_000, 0, 3);
    expect(r.maturity).toBe(36_000);
    expect(r.returns).toBe(0);
  });

  it('handles zero/invalid years and amounts', () => {
    expect(sip(1_000, 12, 0)).toMatchObject({ invested: 0, maturity: 0, yearly: [] });
    expect(sip(-500, 12, 2).invested).toBe(0);
    expect(sip(1_000, 12, Number.NaN).yearly).toEqual([]);
    expect(sip(1_000, 12, 2.9).yearly).toHaveLength(2);
  });
});

describe('stepUpSip', () => {
  it('equals plain SIP when step-up is 0', () => {
    expect(stepUpSip(10_000, 12, 10, 0).maturity).toBeCloseTo(sip(10_000, 12, 10).maturity, 6);
  });

  it('increases the contribution each year', () => {
    const r = stepUpSip(10_000, 12, 3, 10);
    expect(r.invested).toBeCloseTo(12 * (10_000 + 11_000 + 12_100), 6);
    expect(r.yearly[0].invested).toBeCloseTo(120_000, 6);
    expect(r.yearly[1].invested).toBeCloseTo(252_000, 6);
    expect(r.maturity).toBeGreaterThan(sip(10_000, 12, 3).maturity);
  });
});

describe('lumpsum', () => {
  it('compounds annually', () => {
    const r = lumpsum(100_000, 12, 10);
    expect(r.invested).toBe(100_000);
    expect(Math.round(r.maturity)).toBe(310_585);
    expect(r.yearly).toHaveLength(10);
    expect(r.yearly[0].value).toBeCloseTo(112_000, 6);
  });

  it('with 0 years maturity is the principal', () => {
    expect(lumpsum(50_000, 12, 0)).toMatchObject({ maturity: 50_000, returns: 0, yearly: [] });
  });
});

describe('calculateCharges', () => {
  it('computes delivery charges with zero brokerage and default DP', () => {
    const c = calculateCharges({
      tradeType: 'delivery',
      buyPrice: 100,
      sellPrice: 110,
      quantity: 100,
      brokerage: { kind: 'flat', perOrder: 0 },
    });
    expect(c.turnover).toBe(21_000);
    expect(c.brokerage).toBe(0);
    expect(c.stt).toBeCloseTo(21, 6);
    expect(c.exchangeTxn).toBeCloseTo(0.6237, 6);
    expect(c.sebi).toBeCloseTo(0.021, 6);
    expect(c.stamp).toBeCloseTo(1.5, 6);
    expect(c.gst).toBeCloseTo((0.6237 + 0.021) * 0.18, 6);
    expect(c.dp).toBe(CHARGE_RATES.defaultDpCharge);
    expect(c.totalCharges).toBeCloseTo(39.190746, 5);
    expect(c.grossPnl).toBe(1_000);
    expect(c.netPnl).toBeCloseTo(1_000 - 39.190746, 5);
    expect(c.breakevenPoints).toBeCloseTo(0.39190746, 7);
  });

  it('computes intraday charges with capped percent brokerage and no DP', () => {
    const c = calculateCharges({
      tradeType: 'intraday',
      buyPrice: 500,
      sellPrice: 505,
      quantity: 1_000,
      brokerage: { kind: 'percent', percent: 0.03, capPerOrder: 20 },
    });
    expect(c.brokerage).toBe(40);
    expect(c.stt).toBeCloseTo(126.25, 6);
    expect(c.exchangeTxn).toBeCloseTo(29.8485, 6);
    expect(c.sebi).toBeCloseTo(1.005, 6);
    expect(c.stamp).toBeCloseTo(15, 6);
    expect(c.gst).toBeCloseTo(12.75363, 5);
    expect(c.dp).toBe(0);
    expect(c.totalCharges).toBeCloseTo(224.85713, 4);
  });

  it('applies uncapped percent brokerage and custom DP', () => {
    const c = calculateCharges({
      tradeType: 'delivery',
      buyPrice: 100,
      sellPrice: 100,
      quantity: 10,
      brokerage: { kind: 'percent', percent: 0.5 },
      dpCharge: 0,
    });
    expect(c.brokerage).toBeCloseTo(10, 6);
    expect(c.dp).toBe(0);
    expect(c.netPnl).toBeCloseTo(-c.totalCharges, 6);
  });

  it('charges flat brokerage per executed order only', () => {
    const c = calculateCharges({
      tradeType: 'intraday',
      buyPrice: 100,
      sellPrice: 0,
      quantity: 10,
      brokerage: { kind: 'flat', perOrder: 20 },
    });
    expect(c.brokerage).toBe(20);
  });

  it('is zero for zero quantity', () => {
    const c = calculateCharges({
      tradeType: 'delivery',
      buyPrice: 100,
      sellPrice: 110,
      quantity: 0,
      brokerage: { kind: 'flat', perOrder: 20 },
    });
    expect(c.totalCharges).toBe(0);
    expect(c.breakevenPoints).toBe(0);
  });
});

describe('calculatePositionSize', () => {
  function ok(r: ReturnType<typeof calculatePositionSize>): PositionSizeResult {
    if ('error' in r) throw new Error(r.error);
    return r;
  }

  it('sizes a long trade from risk budget', () => {
    const r = ok(calculatePositionSize({ capital: 100_000, riskPercent: 1, entry: 500, stopLoss: 490, target: 530 }));
    expect(r).toMatchObject({
      direction: 'long',
      quantity: 100,
      riskBudget: 1_000,
      riskAmount: 1_000,
      riskPerShare: 10,
      positionValue: 50_000,
      cappedByCapital: false,
      rewardPerShare: 30,
      rewardAmount: 3_000,
      riskReward: 3,
    });
  });

  it('sizes a short trade and floors quantity', () => {
    const r = ok(calculatePositionSize({ capital: 100_000, riskPercent: 1, entry: 500, stopLoss: 507, target: 486 }));
    expect(r.direction).toBe('short');
    expect(r.quantity).toBe(142);
    expect(r.riskReward).toBeCloseTo(2, 6);
  });

  it('caps quantity to available capital', () => {
    const r = ok(calculatePositionSize({ capital: 10_000, riskPercent: 5, entry: 500, stopLoss: 499 }));
    expect(r.quantity).toBe(20);
    expect(r.cappedByCapital).toBe(true);
    expect(r.riskReward).toBeNull();
  });

  it('ignores a target on the wrong side of entry', () => {
    const r = ok(calculatePositionSize({ capital: 100_000, riskPercent: 1, entry: 500, stopLoss: 490, target: 480 }));
    expect(r.rewardPerShare).toBeNull();
    expect(r.riskReward).toBeNull();
  });

  it('rejects invalid input', () => {
    expect(calculatePositionSize({ capital: 0, riskPercent: 1, entry: 100, stopLoss: 90 })).toHaveProperty('error');
    expect(calculatePositionSize({ capital: 1000, riskPercent: 0, entry: 100, stopLoss: 90 })).toHaveProperty('error');
    expect(calculatePositionSize({ capital: 1000, riskPercent: 1, entry: 100, stopLoss: 100 })).toHaveProperty('error');
    expect(calculatePositionSize({ capital: 1000, riskPercent: 1, entry: Number.NaN, stopLoss: 90 })).toHaveProperty('error');
  });
});
