import { unstable_cache } from 'next/cache';
import { NIFTY_100 } from '@/lib/market-data/universe';
import { computeUniverseSnapshots } from '@/lib/screener/universe-snapshots';

/**
 * Nifty 100 screener snapshots for the public screener pages, held in the shared data cache so
 * every preset page (and every function instance) reuses one computation: at most ~100 provider
 * calls per 3 hours regardless of crawler traffic.
 */
export const getPublicNifty100Snapshots = unstable_cache(
  async () => {
    const entry = await computeUniverseSnapshots('nifty100');
    // Throwing keeps an upstream outage out of the cache (and keeps the last good ISR page).
    if (entry.snapshots.length === 0) throw new Error('No screener snapshots available');
    return entry;
  },
  // The symbol list is part of the key, so an index rebalance invalidates the cache on deploy.
  ['public-screener-nifty100', NIFTY_100.join(',')],
  { revalidate: 3 * 60 * 60 }
);
