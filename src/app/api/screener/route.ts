import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UniverseId } from '@/lib/market-data/universe';
import { computeUniverseSnapshots, type UniverseSnapshots } from '@/lib/screener/universe-snapshots';

export const maxDuration = 60;

// Daily-bar snapshots change slowly; share one computation per universe across requests.
const SNAPSHOT_TTL_MS = 30 * 60 * 1000;

type CacheEntry = UniverseSnapshots;
const snapshotCache = new Map<UniverseId, CacheEntry>();
const inFlight = new Map<UniverseId, Promise<CacheEntry>>();

async function getSnapshots(universe: UniverseId): Promise<CacheEntry> {
  const cached = snapshotCache.get(universe);
  if (cached && Date.now() - cached.fetchedAt < SNAPSHOT_TTL_MS) return cached;

  let pending = inFlight.get(universe);
  if (!pending) {
    pending = computeUniverseSnapshots(universe)
      .then((entry) => {
        // Don't pin an empty result (e.g. upstream outage) for the full TTL.
        if (entry.snapshots.length > 0) snapshotCache.set(universe, entry);
        return entry;
      })
      .finally(() => inFlight.delete(universe));
    inFlight.set(universe, pending);
  }
  return pending;
}

// GET /api/screener?universe=nifty50|nifty100 — technical snapshots; filtering happens client-side.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const universe: UniverseId =
      request.nextUrl.searchParams.get('universe') === 'nifty50' ? 'nifty50' : 'nifty100';

    const entry = await getSnapshots(universe);
    return NextResponse.json({
      universe,
      snapshots: entry.snapshots,
      failed: entry.failed,
      generatedAt: entry.generatedAt,
    });
  } catch (error) {
    console.error('Screener error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
