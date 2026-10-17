'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHARGE_RATES, calculateCharges, type BrokerageModel, type TradeType } from '@/lib/calculators/charges';
import { NumberField, Segmented, StatRow, formatInr, toNumber } from './shared';

type BrokerageKind = BrokerageModel['kind'];

export function ChargesCalculator() {
  const [tradeType, setTradeType] = useState<TradeType>('delivery');
  const [buy, setBuy] = useState('1000');
  const [sell, setSell] = useState('1050');
  const [qty, setQty] = useState('100');
  const [brokerageKind, setBrokerageKind] = useState<BrokerageKind>('flat');
  const [flat, setFlat] = useState('20');
  const [percent, setPercent] = useState('0.03');
  const [cap, setCap] = useState('20');
  const [dp, setDp] = useState(String(CHARGE_RATES.defaultDpCharge));

  const result = useMemo(() => {
    const b = toNumber(buy);
    const s = toNumber(sell);
    const q = toNumber(qty);
    if (![b, s, q].every(Number.isFinite)) return null;
    const capN = toNumber(cap);
    const brokerage: BrokerageModel =
      brokerageKind === 'flat'
        ? { kind: 'flat', perOrder: toNumber(flat) }
        : { kind: 'percent', percent: toNumber(percent), capPerOrder: Number.isFinite(capN) ? capN : undefined };
    return calculateCharges({ tradeType, buyPrice: b, sellPrice: s, quantity: q, brokerage, dpCharge: toNumber(dp) });
  }, [tradeType, buy, sell, qty, brokerageKind, flat, percent, cap, dp]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Trade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Segmented
            label="Trade type"
            value={tradeType}
            onChange={setTradeType}
            options={[
              { value: 'delivery', label: 'Delivery' },
              { value: 'intraday', label: 'Intraday' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField id="ch-buy" label="Buy price" prefix="₹" value={buy} onChange={setBuy} />
            <NumberField id="ch-sell" label="Sell price" prefix="₹" value={sell} onChange={setSell} />
          </div>
          <NumberField id="ch-qty" label="Quantity" value={qty} onChange={setQty} step="1" />
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-medium">Brokerage</p>
            <Segmented
              label="Brokerage model"
              value={brokerageKind}
              onChange={setBrokerageKind}
              options={[
                { value: 'flat', label: 'Flat ₹/order' },
                { value: 'percent', label: '% of value' },
              ]}
            />
          </div>
          {brokerageKind === 'flat' ? (
            <NumberField id="ch-flat" label="Per executed order" prefix="₹" value={flat} onChange={setFlat} hint="Use 0 for zero-brokerage delivery." />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <NumberField id="ch-pct" label="Rate" suffix="%" value={percent} onChange={setPercent} step="0.01" />
              <NumberField id="ch-cap" label="Max per order" prefix="₹" value={cap} onChange={setCap} hint="Leave empty for no cap." />
            </div>
          )}
          {tradeType === 'delivery' && (
            <NumberField id="ch-dp" label="DP charge (on sell)" prefix="₹" value={dp} onChange={setDp} hint="Varies by broker/depository." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Charges breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div>
              <StatRow label="Turnover" value={formatInr(result.turnover, 2)} />
              <StatRow label="Brokerage" value={formatInr(result.brokerage, 2)} />
              <StatRow label="STT" value={formatInr(result.stt, 2)} />
              <StatRow label="Exchange transaction charge" value={formatInr(result.exchangeTxn, 2)} />
              <StatRow label="SEBI fee" value={formatInr(result.sebi, 2)} />
              <StatRow label="Stamp duty" value={formatInr(result.stamp, 2)} />
              <StatRow label="GST (18%)" value={formatInr(result.gst, 2)} />
              {tradeType === 'delivery' && <StatRow label="DP charge" value={formatInr(result.dp, 2)} />}
              <StatRow label="Total charges" value={formatInr(result.totalCharges, 2)} emphasis />
              <StatRow label="Gross P&L" value={formatInr(result.grossPnl, 2)} tone={result.grossPnl >= 0 ? 'gain' : 'loss'} />
              <StatRow label="Net P&L" value={formatInr(result.netPnl, 2)} tone={result.netPnl >= 0 ? 'gain' : 'loss'} emphasis />
              <StatRow label="Points to breakeven" value={`${formatInr(result.breakevenPoints, 2)} / share`} />
              <p className="mt-3 text-[11px] text-muted-foreground">
                NSE equity rates for FY 2025-26. Statutory charges change from time to time; your broker&apos;s
                contract note is the final word.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Fill in buy price, sell price and quantity.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
