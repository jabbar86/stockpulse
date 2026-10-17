'use client';

import { useMemo } from 'react';
import type { HoldingWithMetrics } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EQUITY_TAX_RULES, estimateCapitalGains } from '@/lib/tax/capital-gains';
import { formatYmdDisplay } from '@/lib/today/ist';
import { cn } from '@/lib/utils';
import { InfoIcon, LandmarkIcon, ScissorsIcon, TimerIcon } from 'lucide-react';

interface TaxEstimateCardProps {
  holdings: HoldingWithMetrics[];
}

const inr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

function TermBlock({
  label,
  gains,
  losses,
  tax,
  note,
}: {
  label: string;
  gains: number;
  losses: number;
  tax: number;
  note: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1.5 space-y-0.5 text-xs sm:text-sm tabular-nums">
        <p className="flex justify-between">
          <span>Gains</span>
          <span className="text-gain">{inr(gains)}</span>
        </p>
        <p className="flex justify-between">
          <span>Losses</span>
          <span className="text-loss">{losses > 0 ? `−${inr(losses)}` : inr(0)}</span>
        </p>
        <p className="flex justify-between font-semibold">
          <span>Tax</span>
          <span>{inr(tax)}</span>
        </p>
      </div>
      <p className="mt-1.5 text-[10px] sm:text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export function TaxEstimateCard({ holdings }: TaxEstimateCardProps) {
  const est = useMemo(() => estimateCapitalGains(holdings), [holdings]);
  const rules = EQUITY_TAX_RULES;

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <LandmarkIcon className="size-4 text-primary" />
          Capital Gains Tax Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">If you sold everything today</p>
          <p className="text-2xl font-bold tabular-nums">{inr(est.totalTax)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Includes {inr(est.cess)} cess ({rules.cessRate * 100}%). LTCG exemption used:{' '}
            {inr(est.exemptionUsed)} of {inr(rules.ltcgExemption)}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TermBlock
            label={`Short-term (≤ ${rules.longTermMonths} months)`}
            gains={est.shortTermGains}
            losses={est.shortTermLosses}
            tax={est.stcgTax}
            note={`${rules.stcgRate * 100}% on net short-term gains`}
          />
          <TermBlock
            label={`Long-term (> ${rules.longTermMonths} months)`}
            gains={est.longTermGains}
            losses={est.longTermLosses}
            tax={est.ltcgTax}
            note={`${rules.ltcgRate * 100}% above ${inr(rules.ltcgExemption)} exemption`}
          />
        </div>

        {(est.harvestCandidates.length > 0 || est.nearLongTerm.length > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {est.harvestCandidates.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <ScissorsIcon className="size-3.5 text-loss" />
                  Tax-loss harvesting candidates
                </p>
                <ul className="space-y-1">
                  {est.harvestCandidates.slice(0, 5).map((r) => (
                    <li key={r.symbol} className="flex justify-between text-xs tabular-nums">
                      <span className="font-medium">
                        {r.symbol}{' '}
                        <span className="font-normal text-muted-foreground">
                          ({r.term === 'long' ? 'LT' : 'ST'})
                        </span>
                      </span>
                      <span className="text-loss">−{inr(Math.abs(r.gain))}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground">
                  Booking these losses can offset gains you realise this financial year.
                </p>
              </div>
            )}
            {est.nearLongTerm.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <TimerIcon className="size-3.5 text-primary" />
                  Turning long-term soon
                </p>
                <ul className="space-y-1">
                  {est.nearLongTerm.slice(0, 5).map((r) => (
                    <li key={r.symbol} className="flex justify-between text-xs tabular-nums">
                      <span className="font-medium">{r.symbol}</span>
                      <span className="text-muted-foreground">
                        {r.daysToLongTerm}d · {formatYmdDisplay(r.longTermOn)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground">
                  Waiting until these dates moves the gain from {rules.stcgRate * 100}% to{' '}
                  {rules.ltcgRate * 100}% tax.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5 text-[10px] sm:text-xs text-muted-foreground">
          {est.missingBuyDates > 0 && (
            <p className={cn('flex gap-1.5 text-foreground/80')}>
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              {est.missingBuyDates} of {holdings.length} holdings have no buy date, so the date they
              were added to StockPulse is used. Edit a holding to set its buy date.
            </p>
          )}
          <p>
            Estimate for listed equity under rules effective 23 Jul 2024, on unrealised gains at live
            prices. Ignores gains already booked this year, surcharge, grandfathering and brokerage.
            Not tax advice; consult a tax professional.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
