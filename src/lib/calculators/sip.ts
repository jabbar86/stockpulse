/** Growth calculators (SIP, step-up SIP, lumpsum). Pure functions, no I/O. */

export interface GrowthYearRow {
  year: number;
  invested: number;
  value: number;
}

export interface GrowthResult {
  invested: number;
  returns: number;
  maturity: number;
  yearly: GrowthYearRow[];
}

function clampYears(years: number): number {
  return Number.isFinite(years) ? Math.max(0, Math.floor(years)) : 0;
}

function safe(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Step-up SIP: monthly contribution grows by `stepUpPercent` at the start of each year.
 * Annuity-due convention (contribution at the start of each month), monthly compounding
 * at `annualReturnPercent / 12` — the convention used by most Indian SIP calculators.
 */
export function stepUpSip(
  monthlyAmount: number,
  annualReturnPercent: number,
  years: number,
  stepUpPercent: number
): GrowthResult {
  const n = clampYears(years);
  const i = (Number.isFinite(annualReturnPercent) ? annualReturnPercent : 0) / 100 / 12;
  const step = safe(stepUpPercent) / 100;
  let contribution = safe(monthlyAmount);
  let balance = 0;
  let invested = 0;
  const yearly: GrowthYearRow[] = [];

  for (let y = 1; y <= n; y++) {
    for (let m = 0; m < 12; m++) {
      balance = (balance + contribution) * (1 + i);
      invested += contribution;
    }
    yearly.push({ year: y, invested, value: balance });
    contribution *= 1 + step;
  }

  return { invested, returns: balance - invested, maturity: balance, yearly };
}

/** Regular SIP (fixed monthly amount). See {@link stepUpSip} for the convention. */
export function sip(monthlyAmount: number, annualReturnPercent: number, years: number): GrowthResult {
  return stepUpSip(monthlyAmount, annualReturnPercent, years, 0);
}

/** One-time investment compounded annually. */
export function lumpsum(principal: number, annualReturnPercent: number, years: number): GrowthResult {
  const n = clampYears(years);
  const p = safe(principal);
  const r = (Number.isFinite(annualReturnPercent) ? annualReturnPercent : 0) / 100;
  const yearly: GrowthYearRow[] = [];
  for (let y = 1; y <= n; y++) {
    yearly.push({ year: y, invested: p, value: p * Math.pow(1 + r, y) });
  }
  const maturity = n === 0 ? p : yearly[n - 1].value;
  return { invested: p, returns: maturity - p, maturity, yearly };
}
