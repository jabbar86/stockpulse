export type AlertDirection = 'above' | 'below';

export interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  exchange: 'NSE' | 'BSE';
  direction: AlertDirection;
  target_price: number;
  note: string | null;
  triggered_at: string | null;
  triggered_price: number | null;
  created_at: string;
}

/** Untriggered alerts a user may hold at once (free plan). */
export const MAX_ACTIVE_ALERTS = 20;

/** True when `price` has crossed the alert's target in its direction. */
export function evaluateAlert(
  alert: Pick<PriceAlert, 'direction' | 'target_price'>,
  price: number
): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  const target = Number(alert.target_price);
  return alert.direction === 'above' ? price >= target : price <= target;
}

export function formatInr(value: number): string {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function alertNotificationText(
  alert: Pick<PriceAlert, 'symbol' | 'direction' | 'target_price' | 'note'>,
  price: number
): { title: string; body: string } {
  const verb = alert.direction === 'above' ? 'rose above' : 'fell below';
  const title = `${alert.symbol} ${verb} ${formatInr(alert.target_price)}`;
  const body = `Last price ${formatInr(price)}.${alert.note ? ` Note: ${alert.note}` : ''}`;
  return { title, body };
}
