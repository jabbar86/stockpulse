import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { BookEventRow } from '@/types/today';

export const maxDuration = 30;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function yahooSymbol(symbol: string): string {
  const u = symbol.trim().toUpperCase();
  if (u.endsWith('.NS') || u.endsWith('.BO') || u.startsWith('^')) return u;
  return `${u}.NS`;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createServiceRoleClient();
    const { data: holdings, error } = await service
      .from('holdings')
      .select('symbol, name')
      .eq('user_id', user.id)
      .limit(20);

    if (error || !holdings?.length) {
      return NextResponse.json({ events: [] as BookEventRow[] });
    }

    const now = Date.now();
    const horizon = now + 21 * 24 * 60 * 60 * 1000;
    const past = now - 2 * 24 * 60 * 60 * 1000;

    const events: BookEventRow[] = [];

    const batch = holdings.slice(0, 15);
    await Promise.all(
      batch.map(async (h) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const q: any = await yahooFinance.quote(yahooSymbol(h.symbol));
          if (!q) return;

          const earn = q.earningsTimestamp as Date | undefined;
          if (earn instanceof Date && !Number.isNaN(earn.getTime())) {
            const t = earn.getTime();
            if (t >= past && t <= horizon) {
              events.push({
                symbol: h.symbol.replace('.NS', '').replace('.BO', ''),
                name: h.name,
                type: 'earnings',
                date: earn.toISOString().slice(0, 10),
                detail: q.earningsTimestampEnd ? 'Estimated window' : undefined,
              });
            }
          }

          const div = q.dividendDate as Date | undefined;
          if (div instanceof Date && !Number.isNaN(div.getTime())) {
            const t = div.getTime();
            if (t >= past && t <= horizon) {
              events.push({
                symbol: h.symbol.replace('.NS', '').replace('.BO', ''),
                name: h.name,
                type: 'dividend',
                date: div.toISOString().slice(0, 10),
              });
            }
          }
        } catch {
          // skip symbol
        }
      })
    );

    events.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ events });
  } catch (e) {
    console.error('today/book-events', e);
    return NextResponse.json({ events: [] as BookEventRow[] });
  }
}
