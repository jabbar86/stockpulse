'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { lumpsum, stepUpSip } from '@/lib/calculators/sip';
import { NumberField, Segmented, StatRow, formatInr, toNumber } from './shared';

const GrowthChart = dynamic(() => import('./growth-chart'), {
  ssr: false,
  loading: () => <div className="h-[260px] animate-pulse rounded-lg bg-muted/50" />,
});

type Mode = 'sip' | 'lumpsum';

export function SipCalculator() {
  const [mode, setMode] = useState<Mode>('sip');
  const [amount, setAmount] = useState('10000');
  const [rate, setRate] = useState('12');
  const [years, setYears] = useState('10');
  const [stepUp, setStepUp] = useState('0');

  const result = useMemo(() => {
    const a = toNumber(amount);
    const r = toNumber(rate);
    const y = toNumber(years);
    if (![a, r, y].every(Number.isFinite)) return null;
    const capped = Math.min(y, 50);
    return mode === 'sip'
      ? stepUpSip(a, r, capped, Number.isFinite(toNumber(stepUp)) ? toNumber(stepUp) : 0)
      : lumpsum(a, r, capped);
  }, [mode, amount, rate, years, stepUp]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Segmented
            label="Investment type"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'sip', label: 'SIP' },
              { value: 'lumpsum', label: 'Lumpsum' },
            ]}
          />
          <NumberField
            id="sip-amount"
            label={mode === 'sip' ? 'Monthly investment' : 'Total investment'}
            prefix="₹"
            value={amount}
            onChange={setAmount}
            step="500"
          />
          <NumberField id="sip-rate" label="Expected return (p.a.)" suffix="%" value={rate} onChange={setRate} step="0.5" />
          <NumberField id="sip-years" label="Time period" suffix="years" value={years} onChange={setYears} step="1" hint="Up to 50 years." />
          {mode === 'sip' && (
            <NumberField
              id="sip-stepup"
              label="Annual step-up"
              suffix="%"
              value={stepUp}
              onChange={setStepUp}
              step="1"
              hint="Increase your SIP by this % every year. 0 = regular SIP."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Projected growth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
                <StatRow label="Invested" value={formatInr(result.invested)} />
                <StatRow label="Est. returns" value={formatInr(result.returns)} tone={result.returns >= 0 ? 'gain' : 'loss'} />
                <StatRow label="Total value" value={formatInr(result.maturity)} />
              </div>
              <GrowthChart data={result.yearly} />
              <p className="text-[11px] text-muted-foreground">
                {mode === 'sip'
                  ? 'Assumes investment at the start of each month with monthly compounding.'
                  : 'Assumes annual compounding.'}{' '}
                Returns are not guaranteed; actual returns vary with markets.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Fill in all fields to see the projection.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
