'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MutualFundSearchResult, MutualFundDetails } from '@/types';

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

export default function MutualFundsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MutualFundSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MutualFundDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
    const latest = nav[0]; // mfapi returns latest first typically
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
          Search AMFI schemes, track NAV, and view simple return snapshots.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-lg">Search</CardTitle>
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

      {/* Details */}
      {(loadingDetails || selected) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-lg">
              {loadingDetails ? 'Loading scheme…' : selected?.schemeName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingDetails ? (
              <Skeleton className="h-24 w-full" />
            ) : selected && stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground">Latest NAV</p>
                  <p className="font-bold tabular-nums">{stats.latestNav?.toFixed(4)}</p>
                  <p className="text-[10px] text-muted-foreground">{stats.latestDate}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground">7D</p>
                  <p className="font-semibold tabular-nums">
                    {stats.r7 === null ? '--' : `${stats.r7 >= 0 ? '+' : ''}${stats.r7.toFixed(2)}%`}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground">1M</p>
                  <p className="font-semibold tabular-nums">
                    {stats.r30 === null ? '--' : `${stats.r30 >= 0 ? '+' : ''}${stats.r30.toFixed(2)}%`}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground">1Y</p>
                  <p className="font-semibold tabular-nums">
                    {stats.r365 === null ? '--' : `${stats.r365 >= 0 ? '+' : ''}${stats.r365.toFixed(2)}%`}
                  </p>
                </div>
              </div>
            ) : null}

            {selected && selected.nav.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">NAV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.nav.slice(0, 15).map((p) => (
                      <TableRow key={p.date}>
                        <TableCell className="text-xs">{p.date}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {p.nav.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

