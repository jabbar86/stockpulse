import type { MutualFundDetails, MutualFundSearchResult } from '@/types';

const BASE_URL = 'https://api.mfapi.in';

type CacheEntry<T> = { data: T; fetchedAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ttlMs) return null;
  return entry.data;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'StockPulse/1.0' },
    // Next.js route handlers run on server; keep it uncached here and rely on our TTL cache
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`MFAPI request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function searchMutualFunds(query: string): Promise<MutualFundSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  // mfapi has a "search" endpoint
  const key = `mfapi:search:${q.toLowerCase()}`;
  const cached = getCached<MutualFundSearchResult[]>(key, 10 * 60 * 1000);
  if (cached) return cached;

  const url = `${BASE_URL}/mf/search?q=${encodeURIComponent(q)}`;
  const results = await fetchJson<MutualFundSearchResult[]>(url);
  setCached(key, results);
  return results;
}

export async function getMutualFundDetails(schemeCode: number): Promise<MutualFundDetails> {
  const key = `mfapi:scheme:${schemeCode}`;
  const cached = getCached<MutualFundDetails>(key, 15 * 60 * 1000);
  if (cached) return cached;

  const url = `${BASE_URL}/mf/${schemeCode}`;
  // mfapi response shape: { meta: {...}, data: [{date, nav}, ...] }
  const json = await fetchJson<any>(url);

  const schemeName = json?.meta?.scheme_name ?? `Scheme ${schemeCode}`;
  const nav = Array.isArray(json?.data)
    ? json.data
        .filter((r: any) => r?.date && r?.nav)
        .map((r: any) => ({
          date: String(r.date),
          nav: Number(r.nav),
        }))
        .filter((r: any) => Number.isFinite(r.nav))
    : [];

  const details: MutualFundDetails = {
    schemeCode,
    schemeName,
    nav,
  };

  setCached(key, details);
  return details;
}

