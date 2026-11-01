'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EQUITY_TAX_RULES, estimateCapitalGains } from '@/lib/tax/capital-gains';
import { NumberField, StatRow, formatInr, toNumber } from './shared';

/** Fixed example dates (not "today") so the statically rendered page hydrates without a mismatch. */
const EXAMPLE_BUY_DATE = '2025-04-01';
const EXAMPLE_SELL_DATE = '2026-06-15';

function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs sm:text-sm">
        {label}
      </Label>
      <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} className="tabular-nums" />
    </div>
  );
}

/** Single-trade STCG/LTCG estimate for listed equity, reusing the portfolio tax engine. */
export function CapitalGainsCalculator() {
  const [buy, setBuy] = useState('1000');
  const [sell, setSell] = useState('1400');
  const [qty, setQty] = useState('500');
  const [buyDate, setBuyDate] = useState(EXAMPLE_BUY_DATE);
  const [sellDate, setSellDate] = useState(EXAMPLE_SELL_DATE);
  const [otherLtcg, setOtherLtcg] = useState('0');

  const result = useMemo(() => {
    const b = toNumber(buy);
    const s = toNumber(sell);
    const q = toNumber(qty);
    if (![b, s, q].every(Number.isFinite) || !buyDate || !sellDate || sellDate < buyDate) return null;
    const sold = new Date(`${sellDate}T00:00:00Z`);
    const other = Math.max(0, toNumber(otherLtcg) || 0);

    const holdings = [{ symbol: 'TRADE', quantity: q, avg_price: b, current_price: s, buy_date: buyDate, created_at: buyDate }];
    // Other long-term gains booked this FY share the ₹1.25L exemption with this trade.
    if (other > 0) {
      holdings.push({ symbol: 'OTHER', quantity: 1, avg_price: 0, current_price: other, buy_date: '2000-01-01', created_at: '2000-01-01' });
    }

    const estimate = estimateCapitalGains(holdings, sold);
    const trade = estimate.rows[0];
    return { estimate, trade };
  }, [buy, sell, qty, buyDate, sellDate, otherLtcg]);

  const longTerm = result?.trade.term === 'long';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trade details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="cg-buy" label="Buy price" prefix="₹" value={buy} onChange={setBuy} />
            <NumberField id="cg-sell" label="Sell price" prefix="₹" value={sell} onChange={setSell} />
          </div>
          <NumberField id="cg-qty" label="Quantity" value={qty} onChange={setQty} step="1" />
          <div className="grid grid-cols-2 gap-3">
            <DateField id="cg-buy-date" label="Buy date" value={buyDate} onChange={setBuyDate} />
            <DateField id="cg-sell-date" label="Sell date" value={sellDate} onChange={setSellDate} />
          </div>
          <NumberField
            id="cg-other"
            label="Other LTCG already booked this FY"
            prefix="₹"
            value={otherLtcg}
            onChange={setOtherLtcg}
            hint="Shares the ₹1.25 lakh annual LTCG exemption."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimated tax</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">Enter valid prices, quantity and a sell date on or after the buy date.</p>
          ) : (
            <div>
              <StatRow
                label="Holding period"
                value={longTerm ? 'Long term (> 12 months)' : `Short term · LTCG from ${result.trade.longTermOn}`}
              />
              <StatRow label="Capital gain" value={formatInr(result.trade.gain)} tone={result.trade.gain >= 0 ? 'gain' : 'loss'} />
              {longTerm ? (
                <>
                  <StatRow label="LTCG exemption used" value={formatInr(result.estimate.exemptionUsed)} />
                  <StatRow label="Taxable LTCG" value={formatInr(result.estimate.taxableLongTerm)} />
                  <StatRow label={`LTCG tax @ ${EQUITY_TAX_RULES.ltcgRate * 100}%`} value={formatInr(result.estimate.ltcgTax)} />
                </>
              ) : (
                <StatRow label={`STCG tax @ ${EQUITY_TAX_RULES.stcgRate * 100}%`} value={formatInr(result.estimate.stcgTax)} />
              )}
              <StatRow label={`Cess @ ${EQUITY_TAX_RULES.cessRate * 100}%`} value={formatInr(result.estimate.cess)} />
              <StatRow label="Total tax" value={formatInr(result.estimate.totalTax)} emphasis />
              <StatRow
                label="Gain after tax"
                value={formatInr(result.trade.gain - result.estimate.totalTax)}
                tone={result.trade.gain - result.estimate.totalTax >= 0 ? 'gain' : 'loss'}
              />
              {!longTerm && result.trade.gain > 0 && (
                <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                  Selling on or after {result.trade.longTermOn} would make this a long-term gain taxed at{' '}
                  {EQUITY_TAX_RULES.ltcgRate * 100}% above the exemption instead of {EQUITY_TAX_RULES.stcgRate * 100}%.
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                Estimate for listed equity shares and equity mutual funds (STT paid), FY 2024-25 onwards rules. Ignores
                surcharge, grandfathering for pre-Feb 2018 purchases and the basic exemption limit. Not tax advice.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
