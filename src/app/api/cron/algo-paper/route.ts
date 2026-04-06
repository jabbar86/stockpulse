import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { computePortfolioSignalsBundle } from '@/lib/portfolio/signals-engine';
import { buildAlgoTradeIntents } from '@/lib/algo/ai-trading-plan';
import { persistAlgoPaperTrades } from '@/lib/algo/persist-paper-trades';

const CRON_SECRET = process.env.CRON_SECRET;

/** Max users per invocation (avoid timeouts / AI rate limits). */
const MAX_USERS = Number(process.env.ALGO_CRON_MAX_USERS) || 35;

const DEFAULT_MAX_INR = Math.min(
  5_000_000,
  Math.max(1_000, Number(process.env.ALGO_CRON_MAX_INR) || 25_000)
);

function cronStrictEnabled(): boolean {
  const v = process.env.ALGO_CRON_STRICT?.trim();
  if (v === '0' || v === 'false') return false;
  return true;
}

function cronMinConviction(): number {
  const n = Number(process.env.ALGO_CRON_MIN_CONVICTION);
  if (Number.isFinite(n)) return Math.min(95, Math.max(40, n));
  return 60;
}

function cronWithAi(): boolean {
  const v = process.env.ALGO_CRON_WITH_AI?.trim();
  if (v === '0' || v === 'false') return false;
  return true;
}

/**
 * GET /api/cron/algo-paper — scheduled paper algo run for users with holdings.
 * Requires CRON_SECRET when set. Uses strict consensus by default (both rule + AI swing agree).
 */
export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    const querySecret = new URL(request.url).searchParams.get('secret');
    if (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const strict = cronStrictEnabled();
  const minConv = cronMinConviction();
  const withAi = cronWithAi();
  const maxInr = DEFAULT_MAX_INR;

  const service = createServiceRoleClient();
  const errors: string[] = [];
  let usersProcessed = 0;
  let tradesLogged = 0;

  try {
    const { data: rows, error: qErr } = await service.from('holdings').select('user_id');

    if (qErr) {
      console.error('[cron] algo-paper holdings', qErr);
      return NextResponse.json({ error: 'Failed to list holdings' }, { status: 500 });
    }

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
    const slice = userIds.slice(0, MAX_USERS);

    for (const userId of slice) {
      try {
        const bundle = await computePortfolioSignalsBundle(userId, service, { withAi });
        const intents = buildAlgoTradeIntents(bundle, maxInr, {
          strictConsensus: strict,
          minConsensusConviction: minConv,
        });
        const ids = await persistAlgoPaperTrades(service, userId, bundle, intents, {
          cron: true,
          strictConsensus: strict,
          minConsensusConviction: strict ? minConv : undefined,
          maxInrPerTrade: maxInr,
        });
        usersProcessed += 1;
        tradesLogged += ids.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${userId.slice(0, 8)}…: ${msg}`);
      }
    }

    return NextResponse.json({
      ok: true,
      usersProcessed,
      tradesLogged,
      config: {
        maxUsers: MAX_USERS,
        maxInrPerTrade: maxInr,
        strictConsensus: strict,
        minConsensusConviction: strict ? minConv : undefined,
        withAi,
      },
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[cron] algo-paper failed:', e);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

export const maxDuration = 300;
