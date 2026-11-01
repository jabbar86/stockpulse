import { getHistoricalData } from '@/lib/market-data/provider';
import { NIFTY_50, NIFTY_100, type UniverseId } from '@/lib/market-data/universe';
import { buildSnapshot, type ScreenerSnapshot } from '@/lib/screener/filters';

const BATCH_SIZE = 10;

export type UniverseSnapshots = {
  snapshots: ScreenerSnapshot[];
  failed: number;
  generatedAt: string;
  fetchedAt: number;
};

/** Fetch 1y daily candles for every symbol in the universe (batched) and build screener snapshots. */
export async function computeUniverseSnapshots(universe: UniverseId): Promise<UniverseSnapshots> {
  const symbols = universe === 'nifty50' ? NIFTY_50 : NIFTY_100;
  const snapshots: ScreenerSnapshot[] = [];
  let failed = 0;

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const candles = await getHistoricalData(symbol, '1y', 'NSE');
          return buildSnapshot(symbol, candles);
        } catch (e) {
          console.warn('Screener snapshot failed for', symbol, e);
          return null;
        }
      })
    );
    for (const r of results) {
      if (r) snapshots.push(r);
      else failed += 1;
    }
  }

  return { snapshots, failed, generatedAt: new Date().toISOString(), fetchedAt: Date.now() };
}
