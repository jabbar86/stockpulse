'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilterIcon, RefreshCwIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScreenerFiltersPanel } from '@/components/screener/screener-filters-panel';
import { ScreenerResultsTable } from '@/components/screener/screener-results-table';
import {
  applyFilters,
  type ScreenerFilters,
  type ScreenerSnapshot,
} from '@/lib/screener/filters';

type Universe = 'nifty50' | 'nifty100';

type ScreenerResponse = {
  snapshots: ScreenerSnapshot[];
  failed: number;
  generatedAt: string;
};

export default function ScreenerPage() {
  const [universe, setUniverse] = useState<Universe>('nifty100');
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ScreenerFilters>({});
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());

  const load = useCallback(async (u: Universe) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/screener?universe=${u}`);
      if (!res.ok) throw new Error('Failed to load screener data');
      setData((await res.json()) as ScreenerResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load screener data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(universe);
  }, [universe, load]);

  useEffect(() => {
    fetch('/api/watchlist')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const items = (d?.items || []) as { symbol: string }[];
        setWatchlist(new Set(items.map((i) => i.symbol.toUpperCase())));
      })
      .catch(() => {});
  }, []);

  const toggleWatchlist = async (symbol: string) => {
    const has = watchlist.has(symbol);
    try {
      const res = has
        ? await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: 'DELETE' })
        : await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, name: symbol, exchange: 'NSE' }),
          });
      if (!res.ok) return;
      setWatchlist((prev) => {
        const next = new Set(prev);
        if (has) next.delete(symbol);
        else next.add(symbol);
        return next;
      });
    } catch {
      // ignore
    }
  };

  const results = useMemo(() => (data ? applyFilters(data.snapshots, filters) : []), [data, filters]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Screener</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Filter NIFTY stocks by RSI, moving averages, MACD, 52-week range and volume.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={universe} onValueChange={(v) => setUniverse(v as Universe)}>
            <TabsList>
              <TabsTrigger value="nifty50">NIFTY 50</TabsTrigger>
              <TabsTrigger value="nifty100">NIFTY 100</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh"
            disabled={loading}
            onClick={() => load(universe)}
          >
            <RefreshCwIcon className={loading ? 'size-4 animate-spin' : 'size-4'} />
          </Button>
        </div>
      </div>

      <ScreenerFiltersPanel filters={filters} onChange={setFilters} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-muted-foreground">
            <span>
              {loading
                ? 'Scanning stocks…'
                : data
                  ? `${results.length} of ${data.snapshots.length} stocks match`
                  : 'Results'}
            </span>
            {data && !loading && (
              <span className="text-[11px] font-normal">
                Daily bars · updated{' '}
                {new Date(data.generatedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {data.failed > 0 ? ` · ${data.failed} unavailable` : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <EmptyState title="Couldn't load screener" description={error}>
              <Button variant="outline" size="sm" onClick={() => load(universe)}>
                Try again
              </Button>
            </EmptyState>
          ) : results.length === 0 ? (
            <EmptyState
              icon={FilterIcon}
              title="No stocks match these filters"
              description="Loosen a filter or clear them to see the full list."
            />
          ) : (
            <ScreenerResultsTable rows={results} watchlist={watchlist} onToggleWatchlist={toggleWatchlist} />
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Screens are based on end-of-day technical indicators and are for educational purposes only — not a
        recommendation to buy or sell.
      </p>
    </div>
  );
}
