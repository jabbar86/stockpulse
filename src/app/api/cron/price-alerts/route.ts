import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getQuote } from '@/lib/market-data/provider';
import { getNseSession } from '@/lib/market/nse-session';
import { alertNotificationText, evaluateAlert, type PriceAlert } from '@/lib/alerts/price-alerts';

const CRON_SECRET = process.env.CRON_SECRET;
const QUOTE_CONCURRENCY = 8;

export const maxDuration = 60;

/**
 * GET /api/cron/price-alerts — check untriggered price alerts against latest quotes
 * and drop a bell notification when one crosses. Pass ?force=1 to run outside NSE hours.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = url.searchParams.get('secret');
    if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const session = getNseSession();
  if (!session.isOpen && url.searchParams.get('force') !== '1') {
    return NextResponse.json({ skipped: true, reason: 'NSE closed' });
  }

  try {
    const service = createServiceRoleClient();
    const { data: alerts, error } = await service
      .from('price_alerts')
      .select('id,user_id,symbol,exchange,direction,target_price,note')
      .is('triggered_at', null)
      .limit(2000);

    if (error) {
      console.error('[cron] price alerts load', error);
      return NextResponse.json({ error: 'Failed to load alerts', details: error.message }, { status: 500 });
    }
    if (!alerts?.length) {
      return NextResponse.json({ checked: 0, triggered: 0 });
    }

    // One quote per symbol/exchange
    const keys = [...new Set(alerts.map((a) => `${a.symbol}|${a.exchange}`))];
    const prices = new Map<string, number>();
    for (let i = 0; i < keys.length; i += QUOTE_CONCURRENCY) {
      await Promise.all(
        keys.slice(i, i + QUOTE_CONCURRENCY).map(async (key) => {
          const [symbol, exchange] = key.split('|');
          try {
            const q = await getQuote(symbol, null, exchange);
            if (q?.price) prices.set(key, q.price);
          } catch (e) {
            console.warn('[cron] price alerts quote', symbol, e);
          }
        })
      );
    }

    let triggered = 0;
    const nowIso = new Date().toISOString();
    for (const alert of alerts as Pick<
      PriceAlert,
      'id' | 'user_id' | 'symbol' | 'exchange' | 'direction' | 'target_price' | 'note'
    >[]) {
      const price = prices.get(`${alert.symbol}|${alert.exchange}`);
      if (price === undefined || !evaluateAlert(alert, price)) continue;

      // Conditional update so overlapping runs never notify twice
      const { data: updated } = await service
        .from('price_alerts')
        .update({ triggered_at: nowIso, triggered_price: price })
        .eq('id', alert.id)
        .is('triggered_at', null)
        .select('id');
      if (!updated?.length) continue;

      const { title, body } = alertNotificationText(alert, price);
      const { error: nErr } = await service.from('user_notifications').insert({
        user_id: alert.user_id,
        title,
        body,
        link_href: `/stocks/${encodeURIComponent(alert.symbol)}`,
        kind: 'alert',
      });
      if (nErr) console.error('[cron] price alert notification', nErr);
      triggered++;
    }

    return NextResponse.json({ checked: alerts.length, symbols: keys.length, triggered });
  } catch (error) {
    console.error('[cron] price alerts', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
