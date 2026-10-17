/**
 * Capital-gains estimate for listed Indian equity (STT-paid), rules effective 23 Jul 2024.
 * This is an estimate, not tax advice: it ignores grandfathering (pre-2018 buys),
 * surcharge, realised gains already booked this FY, and the basic-exemption shortfall.
 */
export const EQUITY_TAX_RULES = {
  /** Held for more than this many months = long-term. */
  longTermMonths: 12,
  stcgRate: 0.2,
  ltcgRate: 0.125,
  /** Annual LTCG exemption (₹). */
  ltcgExemption: 125_000,
  /** Health & education cess on tax. */
  cessRate: 0.04,
  /** "Near LTCG" window for gains worth waiting on. */
  nearLongTermDays: 60,
} as const;

export interface TaxHoldingInput {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  buy_date?: string | null;
  created_at: string;
}

export type GainTerm = 'short' | 'long';

export interface TaxHoldingRow {
  symbol: string;
  term: GainTerm;
  gain: number;
  /** YYYY-MM-DD the holding was treated as bought. */
  heldSince: string;
  /** True when buy_date was missing and created_at was used. */
  dateEstimated: boolean;
  /** First YYYY-MM-DD on which a sale is long-term. */
  longTermOn: string;
  /** 0 when already long-term. */
  daysToLongTerm: number;
}

export interface CapitalGainsEstimate {
  rows: TaxHoldingRow[];
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  /** After set-off. */
  netShortTerm: number;
  netLongTerm: number;
  exemptionUsed: number;
  taxableLongTerm: number;
  stcgTax: number;
  ltcgTax: number;
  cess: number;
  totalTax: number;
  /** Holdings with an unrealised loss, biggest loss first. */
  harvestCandidates: TaxHoldingRow[];
  /** In gain and turning long-term within the window, soonest first. */
  nearLongTerm: TaxHoldingRow[];
  missingBuyDates: number;
}

const DAY_MS = 86_400_000;

function toUtcDate(value: string): Date | null {
  const ymd = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Day after the 12-month anniversary (e.g. bought 2024-03-15 → long-term from 2025-03-16). */
export function longTermStartDate(bought: Date): Date {
  const y = bought.getUTCFullYear();
  const m = bought.getUTCMonth() + EQUITY_TAX_RULES.longTermMonths;
  const d = bought.getUTCDate();
  // Clamp 29 Feb etc. to the last day of the target month.
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const anniversary = new Date(Date.UTC(y, m, Math.min(d, lastDay)));
  return new Date(anniversary.getTime() + DAY_MS);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function estimateCapitalGains(
  holdings: TaxHoldingInput[],
  today: Date = new Date()
): CapitalGainsEstimate {
  const todayUtc = toUtcDate(today.toISOString())!;
  const rules = EQUITY_TAX_RULES;

  const rows: TaxHoldingRow[] = [];
  let missingBuyDates = 0;

  for (const h of holdings) {
    const fromBuy = h.buy_date ? toUtcDate(h.buy_date) : null;
    const bought = fromBuy ?? toUtcDate(h.created_at) ?? todayUtc;
    if (!fromBuy) missingBuyDates += 1;

    const ltStart = longTermStartDate(bought);
    const daysToLongTerm = Math.max(0, Math.round((ltStart.getTime() - todayUtc.getTime()) / DAY_MS));

    rows.push({
      symbol: h.symbol,
      term: daysToLongTerm === 0 ? 'long' : 'short',
      gain: round2((h.current_price - h.avg_price) * h.quantity),
      heldSince: ymd(bought),
      dateEstimated: !fromBuy,
      longTermOn: ymd(ltStart),
      daysToLongTerm,
    });
  }

  const sum = (term: GainTerm, sign: 1 | -1) =>
    rows
      .filter((r) => r.term === term && Math.sign(r.gain) === sign)
      .reduce((s, r) => s + Math.abs(r.gain), 0);

  const shortTermGains = sum('short', 1);
  const shortTermLosses = sum('short', -1);
  const longTermGains = sum('long', 1);
  const longTermLosses = sum('long', -1);

  // ST loss offsets ST gains first, then LT gains; LT loss offsets only LT gains.
  const netShortTerm = Math.max(0, shortTermGains - shortTermLosses);
  const stLossLeft = Math.max(0, shortTermLosses - shortTermGains);
  const netLongTerm = Math.max(0, longTermGains - longTermLosses - stLossLeft);

  const exemptionUsed = Math.min(netLongTerm, rules.ltcgExemption);
  const taxableLongTerm = netLongTerm - exemptionUsed;

  const stcgTax = netShortTerm * rules.stcgRate;
  const ltcgTax = taxableLongTerm * rules.ltcgRate;
  const cess = (stcgTax + ltcgTax) * rules.cessRate;

  return {
    rows,
    shortTermGains: round2(shortTermGains),
    shortTermLosses: round2(shortTermLosses),
    longTermGains: round2(longTermGains),
    longTermLosses: round2(longTermLosses),
    netShortTerm: round2(netShortTerm),
    netLongTerm: round2(netLongTerm),
    exemptionUsed: round2(exemptionUsed),
    taxableLongTerm: round2(taxableLongTerm),
    stcgTax: round2(stcgTax),
    ltcgTax: round2(ltcgTax),
    cess: round2(cess),
    totalTax: round2(stcgTax + ltcgTax + cess),
    harvestCandidates: rows.filter((r) => r.gain < 0).sort((a, b) => a.gain - b.gain),
    nearLongTerm: rows
      .filter((r) => r.term === 'short' && r.gain > 0 && r.daysToLongTerm <= rules.nearLongTermDays)
      .sort((a, b) => a.daysToLongTerm - b.daysToLongTerm),
    missingBuyDates,
  };
}
