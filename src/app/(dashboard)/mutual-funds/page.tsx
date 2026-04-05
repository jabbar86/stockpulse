'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, SearchIcon, TrendingUpIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { MutualFundSearchResult, MutualFundDetails } from '@/types';

const NavChart = dynamic(() => import('@/components/mutual-funds/nav-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center" style={{ minHeight: 340 }}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
});

function parseMfDate(ddmmyyyy: string): Date | null {
  const [dd, mm, yyyy] = ddmmyyyy.split('-').map((x) => Number(x));
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

function pctChange(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return 0;
  return ((b - a) / a) * 100;
}

function ReturnBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">--</span>;
  const isGain = value >= 0;
  return (
    <span className={`font-semibold tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
      {isGain ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

export default function MutualFundsPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MutualFundSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MutualFundDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [trending, setTrending] = useState<MutualFundSearchResult[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    async function loadTrending() {
      try {
        const res = await fetch('/api/mutual-funds/trending', {
          signal: AbortSignal.timeout(25_000),
        });
        if (!res.ok) return;
        const data = await res.json();
        setTrending(data.results || []);
      } catch {
        // ignore
      } finally {
        setLoadingTrending(false);
      }
    }
    loadTrending();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const query = q.trim();
      if (!query) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/mutual-funds/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const openScheme = async (schemeCode: number) => {
    setLoadingDetails(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/mutual-funds/${schemeCode}`);
      if (!res.ok) return;
      const data = (await res.json()) as MutualFundDetails;
      setSelected(data);
    } catch {
      // ignore
    } finally {
      setLoadingDetails(false);
    }
  };

  const stats = useMemo(() => {
    const nav = selected?.nav || [];
    if (nav.length < 2) return null;
    const latest = nav[0];
    const latestNav = latest?.nav;
    const latestDate = latest?.date;

    const findClosest = (daysBack: number) => {
      const latestDt = latestDate ? parseMfDate(latestDate) : null;
      if (!latestDt) return null;
      const target = new Date(latestDt.getTime() - daysBack * 24 * 60 * 60 * 1000);
      let best: { date: string; nav: number; diff: number } | null = null;
      for (const p of nav) {
        const d = parseMfDate(p.date);
        if (!d) continue;
        const diff = Math.abs(d.getTime() - target.getTime());
        if (!best || diff < best.diff) best = { date: p.date, nav: p.nav, diff };
      }
      return best ? { date: best.date, nav: best.nav } : null;
    };

    const nav7 = findClosest(7);
    const nav30 = findClosest(30);
    const nav365 = findClosest(365);

    return {
      latestNav,
      latestDate,
      r7: nav7 ? pctChange(nav7.nav, latestNav) : null,
      r30: nav30 ? pctChange(nav30.nav, latestNav) : null,
      r365: nav365 ? pctChange(nav365.nav, latestNav) : null,
    };
  }, [selected]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-3xl font-bold">Mutual Funds</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Search AMFI schemes, track NAV history with interactive charts.
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <SearchIcon className="size-4 text-muted-foreground" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by fund name (e.g. 'Parag Parikh', 'HDFC Flexi', 'Nifty 50')"
          />

          {searching && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="divide-y rounded-lg border">
              {results.slice(0, 15).map((r) => (
                <button
                  key={r.schemeCode}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  onClick={() => openScheme(r.schemeCode)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-medium line-clamp-1">
                      {r.schemeName}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {r.schemeCode}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && q.trim() && results.length === 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              No schemes found.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trending */}
      {!selected && !loadingDetails && !q.trim() && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <TrendingUpIcon className="size-4 text-primary" />
              Trending Mutual Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTrending ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : trending.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                Trending list is unavailable right now. Try searching above.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {trending.slice(0, 10).map((r) => (
                  <button
                    key={r.schemeCode}
                    onClick={() => openScheme(r.schemeCode)}
                    className="rounded-lg border px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm font-medium line-clamp-2">
                        {r.schemeName}
                      </p>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {r.schemeCode}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fund Details with Chart */}
      {(loadingDetails || selected) && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-sm sm:text-lg leading-snug">
                {loadingDetails ? 'Loading scheme...' : selected?.schemeName}
              </CardTitle>
              {selected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft className="size-3.5 mr-1" />
                  Back
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingDetails ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
                <Skeleton className="w-full" style={{ height: 340 }} />
              </div>
            ) : selected && stats ? (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground">Latest NAV</p>
                    <p className="text-lg font-bold tabular-nums">{stats.latestNav?.toFixed(4)}</p>
                    <p className="text-[10px] text-muted-foreground">{stats.latestDate}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground">7 Day Return</p>
                    <p className="text-lg"><ReturnBadge value={stats.r7} /></p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground">1 Month Return</p>
                    <p className="text-lg"><ReturnBadge value={stats.r30} /></p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground">1 Year Return</p>
                    <p className="text-lg"><ReturnBadge value={stats.r365} /></p>
                  </div>
                </div>

                {/* NAV Chart */}
                {selected.nav.length > 0 && (
                  <NavChart
                    key={selected.schemeCode}
                    data={selected.nav}
                    schemeName={selected.schemeName}
                  />
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
