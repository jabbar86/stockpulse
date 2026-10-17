/** NSE equity brokerage & statutory charges. Pure functions, no I/O. */

export type TradeType = 'delivery' | 'intraday';

/**
 * Statutory rates (as fractions of value) as of FY 2025-26. Exchanges and SEBI revise these
 * periodically — re-check against NSE / broker charge sheets before relying on them.
 */
export const CHARGE_RATES = {
  stt: { delivery: { buy: 0.001, sell: 0.001 }, intraday: { buy: 0, sell: 0.00025 } },
  /** NSE transaction charge on turnover. */
  exchangeTxn: 0.0000297,
  /** SEBI turnover fee: ₹10 per crore. */
  sebi: 10 / 1e7,
  /** Stamp duty, buy side only. */
  stamp: { delivery: 0.00015, intraday: 0.00003 },
  gst: 0.18,
  /** Default DP charge per scrip on a delivery sell (₹13.5 + GST at many discount brokers). */
  defaultDpCharge: 15.93,
} as const;

export type BrokerageModel =
  | { kind: 'flat'; perOrder: number }
  | { kind: 'percent'; percent: number; capPerOrder?: number };

export interface ChargesInput {
  tradeType: TradeType;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  brokerage: BrokerageModel;
  /** Applied once on delivery sell; ignored for intraday. Defaults to {@link CHARGE_RATES.defaultDpCharge}. */
  dpCharge?: number;
}

export interface ChargesBreakdown {
  turnover: number;
  brokerage: number;
  stt: number;
  exchangeTxn: number;
  sebi: number;
  stamp: number;
  gst: number;
  dp: number;
  totalCharges: number;
  grossPnl: number;
  netPnl: number;
  /** Price move per share needed to cover all charges. */
  breakevenPoints: number;
}

function nonNeg(n: number | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0;
}

function brokerageForOrder(model: BrokerageModel, orderValue: number): number {
  if (orderValue <= 0) return 0;
  if (model.kind === 'flat') return nonNeg(model.perOrder);
  const pct = (nonNeg(model.percent) / 100) * orderValue;
  const cap = model.capPerOrder;
  return typeof cap === 'number' && Number.isFinite(cap) && cap >= 0 ? Math.min(pct, cap) : pct;
}

export function calculateCharges(input: ChargesInput): ChargesBreakdown {
  const qty = nonNeg(input.quantity);
  const buyValue = nonNeg(input.buyPrice) * qty;
  const sellValue = nonNeg(input.sellPrice) * qty;
  const turnover = buyValue + sellValue;
  const t = input.tradeType;

  const brokerage =
    brokerageForOrder(input.brokerage, buyValue) + brokerageForOrder(input.brokerage, sellValue);
  const stt = buyValue * CHARGE_RATES.stt[t].buy + sellValue * CHARGE_RATES.stt[t].sell;
  const exchangeTxn = turnover * CHARGE_RATES.exchangeTxn;
  const sebi = turnover * CHARGE_RATES.sebi;
  const stamp = buyValue * CHARGE_RATES.stamp[t];
  const gst = (brokerage + exchangeTxn + sebi) * CHARGE_RATES.gst;
  const dp =
    t === 'delivery' && sellValue > 0
      ? input.dpCharge === undefined
        ? CHARGE_RATES.defaultDpCharge
        : nonNeg(input.dpCharge)
      : 0;

  const totalCharges = brokerage + stt + exchangeTxn + sebi + stamp + gst + dp;
  const grossPnl = sellValue - buyValue;

  return {
    turnover,
    brokerage,
    stt,
    exchangeTxn,
    sebi,
    stamp,
    gst,
    dp,
    totalCharges,
    grossPnl,
    netPnl: grossPnl - totalCharges,
    breakevenPoints: qty > 0 ? totalCharges / qty : 0,
  };
}
