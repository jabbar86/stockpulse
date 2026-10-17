'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculatePositionSize } from '@/lib/calculators/position-size';
import { NumberField, StatRow, formatInr, toNumber } from './shared';

export function PositionSizeCalculator() {
  const [capital, setCapital] = useState('100000');
  const [risk, setRisk] = useState('1');
  const [entry, setEntry] = useState('500');
  const [stop, setStop] = useState('490');
  const [target, setTarget] = useState('530');

  const result = useMemo(
    () =>
      calculatePositionSize({
        capital: toNumber(capital),
        riskPercent: toNumber(risk),
        entry: toNumber(entry),
        stopLoss: toNumber(stop),
        target: toNumber(target),
      }),
    [capital, risk, entry, stop, target]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Risk plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberField id="ps-capital" label="Trading capital" prefix="₹" value={capital} onChange={setCapital} step="1000" />
          <NumberField id="ps-risk" label="Risk per trade" suffix="%" value={risk} onChange={setRisk} step="0.25" hint="Many traders risk 0.5–2% per trade." />
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="ps-entry" label="Entry price" prefix="₹" value={entry} onChange={setEntry} />
            <NumberField id="ps-stop" label="Stop-loss" prefix="₹" value={stop} onChange={setStop} />
          </div>
          <NumberField id="ps-target" label="Target (optional)" prefix="₹" value={target} onChange={setTarget} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Position</CardTitle>
        </CardHeader>
        <CardContent>
          {'error' in result ? (
            <p className="text-sm text-muted-foreground">{result.error}</p>
          ) : (
            <div>
              <StatRow label="Direction" value={result.direction === 'long' ? 'Long (buy)' : 'Short (sell)'} />
              <StatRow label="Quantity" value={result.quantity.toLocaleString('en-IN')} emphasis />
              <StatRow label="Position value" value={formatInr(result.positionValue, 2)} />
              <StatRow label="Risk per share" value={formatInr(result.riskPerShare, 2)} />
              <StatRow label="Risk budget" value={formatInr(result.riskBudget, 2)} />
              <StatRow label="Loss if stop hits" value={formatInr(result.riskAmount, 2)} tone="loss" />
              {result.rewardAmount !== null && (
                <StatRow label="Profit at target" value={formatInr(result.rewardAmount, 2)} tone="gain" />
              )}
              <StatRow
                label="Risk : reward"
                value={result.riskReward === null ? '—' : `1 : ${result.riskReward.toFixed(2)}`}
                emphasis
              />
              {result.cappedByCapital && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Quantity limited by available capital (no leverage assumed).
                </p>
              )}
              {result.quantity === 0 && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Your risk budget is smaller than the risk on one share — widen risk % or tighten the stop.
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">Excludes brokerage, taxes and slippage.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
