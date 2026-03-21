'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLink } from '@/components/dashboard/dashboard-link';
import type { HoldingWithMetrics, PortfolioSummary } from '@/types';
import type { BookEventRow } from '@/types/today';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useLivePrices } from '@/hooks/use-live-prices';
import { useAuth } from '@/lib/auth/session-provider';
import {
  formatIstLong,
  formatYmdDisplay,
  greetingForIstHour,
  istHour,
  istYmd,
} from '@/lib/today/ist';
import { JournalCard } from '@/components/today/journal-card';
import { RemindersCard } from '@/components/today/reminders-card';
import { DigestCard } from '@/components/today/digest-card';
import { loadReminders } from '@/lib/today/storage';
import type { SipReminder } from '@/lib/today/storage';
import { cn } from '@/lib/utils';
import {
  ArrowRightIcon,
  CalendarClockIcon,
  Loader2Icon,
  ScaleIcon,
  SparklesIcon,
  SunriseIcon,
  TargetIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react';

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

type BootstrapWorkspace = {
  journal: string;
  reminders: SipReminder[];
  digest: { emailEnabled: boolean };
  available: boolean;
  hint?: string;
};

type BootstrapPayload = {
  holdings: HoldingWithMetrics[];
  summary: PortfolioSummary;
  workspace: BootstrapWorkspace;
};

function QuoteSkeleton() {
  return <Skeleton className="h-8 w-24 rounded-md" />;
}

export default function TodayPage() {
  const { profile } = useAuth();
  const firstName = profile?.name?.trim().split(/\s+/)[0];

  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [holdings, setHoldings] = useState<HoldingWithMetrics[]>([]);
  const [workspace, setWorkspace] = useState<BootstrapWorkspace | null>(null);
  const [bookEvents, setBookEvents] = useState<BookEventRow[]>([]);
  const migrationDone = useRef(false);

  const journalDateKey = istYmd();
  const hour = istHour();
  const greeting = greetingForIstHour(hour);
  const dateLine = formatIstLong();

  useEffect(() => {
    let cancelled = false;
    migrationDone.current = false;

    (async () => {
      setBootstrapLoading(true);
      setBootstrapError(null);
      try {
        const [bootRes, evRes] = await Promise.all([
          fetch('/api/today/bootstrap', { cache: 'no-store' }),
          fetch('/api/today/book-events', { cache: 'no-store' }),
        ]);

        if (cancelled) return;

        if (!bootRes.ok) {
          const err = await bootRes.json().catch(() => ({}));
          setBootstrapError((err as { error?: string }).error ?? 'Could not load Today');
          setSummary(null);
          setHoldings([]);
          setWorkspace(null);
          return;
        }

        const data = (await bootRes.json()) as BootstrapPayload;
        setSummary(data.summary);
        setHoldings(data.holdings);
        setWorkspace(data.workspace);

        if (evRes.ok) {
          const evJson = (await evRes.json()) as { events?: BookEventRow[] };
          setBookEvents(evJson.events ?? []);
        } else {
          setBookEvents([]);
        }

        // One-time: push local reminders to cloud if server empty
        if (
          data.workspace.available &&
          data.workspace.reminders.length === 0 &&
          !migrationDone.current
        ) {
          migrationDone.current = true;
          const local = loadReminders();
          if (local.length > 0) {
            const res = await fetch('/api/today/workspace', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reminders: local }),
            });
            if (res.ok && !cancelled) {
              setWorkspace((w) =>
                w ? { ...w, reminders: local } : w
              );
            }
          }
        } else {
          migrationDone.current = true;
        }
      } catch {
        if (!cancelled) {
          setBootstrapError('Network error');
          setWorkspace(null);
        }
      } finally {
        if (!cancelled) setBootstrapLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const pollSymbols = useMemo(() => {
    const fromHoldings = holdings.map((h) => h.symbol);
    return [...new Set([...fromHoldings, '^NSEI', '^BSESN'])];
  }, [holdings]);

  const { getPrice, connected, lastUpdate, marketStatus, quotesReady } = useLivePrices({
    symbols: pollSymbols,
    enabled: pollSymbols.length > 0 && !bootstrapLoading,
  });

  const liveHoldings = useMemo(() => {
    return holdings.map((h) => {
      const live = getPrice(h.symbol);
      if (!live) return h;
      const currentPrice = live.price;
      const currentValue = currentPrice * h.quantity;
      const investedValue = h.avg_price * h.quantity;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      return {
        ...h,
        current_price: currentPrice,
        current_value: currentValue,
        pnl,
        pnl_percent: pnlPercent,
        day_change: live.change * h.quantity,
        day_change_percent: live.changePercent,
      };
    });
  }, [holdings, getPrice]);

  const liveSummary = useMemo(() => {
    if (!summary || liveHoldings.length === 0) return summary;
    const totalInvested = liveHoldings.reduce((sum, h) => sum + h.avg_price * h.quantity, 0);
    const currentValue = liveHoldings.reduce((sum, h) => sum + h.current_value, 0);
    const totalPnl = currentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const dayChange = liveHoldings.reduce((sum, h) => sum + h.day_change, 0);
    const dayChangePercent = totalInvested > 0 ? (dayChange / totalInvested) * 100 : 0;
    return {
      ...summary,
      current_value: currentValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      day_change: dayChange,
      day_change_percent: dayChangePercent,
    };
  }, [summary, liveHoldings]);

  const nifty = getPrice('^NSEI');
  const sensex = getPrice('^BSESN');

  const movers = useMemo(() => {
    if (liveHoldings.length === 0) return [];
    return [...liveHoldings]
      .filter((h) => h.day_change !== 0)
      .sort((a, b) => Math.abs(b.day_change) - Math.abs(a.day_change))
      .slice(0, 4);
  }, [liveHoldings]);

  const totalDayMove = useMemo(
    () => liveHoldings.reduce((s, h) => s + h.day_change, 0),
    [liveHoldings]
  );

  const risk = useMemo(() => {
    if (liveHoldings.length === 0) return null;
    const total = liveHoldings.reduce((s, h) => s + h.current_value, 0);
    if (total <= 0) return null;
    const weights = liveHoldings.map((h) => ({
      symbol: h.symbol,
      w: (h.current_value / total) * 100,
    }));
    const maxW = Math.max(...weights.map((x) => x.w));
    const top3 = [...weights].sort((a, b) => b.w - a.w).slice(0, 3);
    const top3Sum = top3.reduce((s, x) => s + x.w, 0);
    return { maxW, top3Sum, heaviest: top3[0]?.symbol ?? '—' };
  }, [liveHoldings]);

  const vsNifty =
    nifty && liveSummary && liveHoldings.length > 0
      ? liveSummary.day_change_percent - nifty.changePercent
      : null;

  const syncEnabled = workspace?.available ?? false;
  const wsHint = workspace?.hint;

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-7 pb-8">
      {/* Top load indicator */}
      {bootstrapLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />
          <span>Loading portfolio and calendar data…</span>
        </div>
      )}

      {bootstrapError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {bootstrapError}
        </div>
      )}

      {wsHint && !bootstrapLoading && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200">
          {wsHint}
        </p>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/12 via-card to-card px-4 py-5 sm:px-6 sm:py-7 ring-1 ring-primary/10">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <SunriseIcon className="size-5 sm:size-6" />
              <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
            </div>
            {bootstrapLoading ? (
              <div className="space-y-2 pt-1">
                <Skeleton className="h-8 w-64 max-w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
                  {greeting}
                  {firstName ? `, ${firstName}` : ''}
                </h1>
                <p className="text-sm text-muted-foreground">{dateLine}</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            {!bootstrapLoading && pollSymbols.length > 0 && !quotesReady ? (
              <Badge variant="outline" className="gap-1.5">
                <Loader2Icon className="size-3 animate-spin" />
                Quotes…
              </Badge>
            ) : !bootstrapLoading && marketStatus.isOpen ? (
              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5 border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
                  !connected && 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400'
                )}
              >
                {connected ? <WifiIcon className="size-3.5" /> : <WifiOffIcon className="size-3.5" />}
                {connected ? 'Live quotes' : 'Connecting…'}
              </Badge>
            ) : !bootstrapLoading ? (
              <Badge variant="secondary" className="text-muted-foreground">
                {marketStatus.message ?? 'Market closed'}
              </Badge>
            ) : null}
            {lastUpdate && quotesReady && (
              <span className="text-[10px] text-muted-foreground tabular-nums sm:text-right">
                Updated {lastUpdate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </span>
            )}
          </div>
        </div>
        <p className="relative mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Your daily snapshot: how you stack up vs benchmarks, what drove today&apos;s P&amp;L, a quick risk read,
          calendar hints on your book, plus notes and reminders.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-primary/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TargetIcon className="size-4 text-primary" />
              <CardTitle className="text-sm sm:text-lg">You vs the market</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Portfolio day move uses your live positions; indices from the same quote stream.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bootstrapLoading ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border bg-muted/15 px-3 py-3 sm:py-4 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : liveHoldings.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Add holdings to see how your day compares to Nifty & Sensex.
                </p>
                <DashboardLink
                  href="/portfolio"
                  className={cn(buttonVariants({ size: 'sm' }), 'mt-3 inline-flex gap-1.5')}
                >
                  Go to portfolio
                  <ArrowRightIcon className="size-4" />
                </DashboardLink>
              </div>
            ) : liveSummary ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-muted/15 px-3 py-3 sm:py-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Your day</p>
                  {!quotesReady ? (
                    <div className="mt-2">
                      <QuoteSkeleton />
                    </div>
                  ) : (
                    <>
                      <p
                        className={cn(
                          'mt-1 text-xl font-bold tabular-nums sm:text-2xl',
                          liveSummary.day_change_percent >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {formatPct(liveSummary.day_change_percent)}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatInr(liveSummary.day_change)} on book
                      </p>
                    </>
                  )}
                </div>
                <div className="rounded-xl border bg-muted/15 px-3 py-3 sm:py-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Nifty 50</p>
                  <div className="mt-1">
                    {!quotesReady || !nifty ? (
                      <QuoteSkeleton />
                    ) : (
                      <p
                        className={cn(
                          'text-xl font-bold tabular-nums sm:text-2xl',
                          nifty.changePercent >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {formatPct(nifty.changePercent)}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Index day %</p>
                </div>
                <div className="rounded-xl border bg-muted/15 px-3 py-3 sm:py-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sensex</p>
                  <div className="mt-1">
                    {!quotesReady || !sensex ? (
                      <QuoteSkeleton />
                    ) : (
                      <p
                        className={cn(
                          'text-xl font-bold tabular-nums sm:text-2xl',
                          sensex.changePercent >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {formatPct(sensex.changePercent)}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Index day %</p>
                </div>
              </div>
            ) : null}

            {vsNifty !== null && Number.isFinite(vsNifty) && quotesReady && (
              <div
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm',
                  vsNifty >= 0
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-500/10 text-red-800 dark:text-red-300'
                )}
              >
                <SparklesIcon className="size-4 shrink-0" />
                <span>
                  {vsNifty >= 0 ? 'Ahead of' : 'Behind'}{' '}
                  <span className="font-semibold">Nifty 50</span> by{' '}
                  <span className="font-mono font-semibold tabular-nums">{formatPct(Math.abs(vsNifty))}</span>{' '}
                  on today&apos;s session (by day % on your book vs the index).
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ScaleIcon className="size-4 text-primary" />
              <CardTitle className="text-sm sm:text-base">Risk at a glance</CardTitle>
            </div>
            <CardDescription className="text-xs">Simple concentration checks, not advice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {bootstrapLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !risk ? (
              <p className="text-xs text-muted-foreground">
                No positions yet — once you add holdings, we&apos;ll show your largest weights here.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Largest line</p>
                  <p className="font-semibold">
                    {risk.heaviest}{' '}
                    <span className="font-mono text-muted-foreground tabular-nums">
                      ({risk.maxW.toFixed(1)}%)
                    </span>
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Top 3 names</p>
                  <p className="font-mono font-semibold tabular-nums">{risk.top3Sum.toFixed(1)}%</p>
                  <p className="text-[11px] text-muted-foreground">of total equity value</p>
                </div>
                <div
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-[11px] leading-snug',
                    risk.maxW > 45 || risk.top3Sum > 75
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  )}
                >
                  {risk.maxW > 45
                    ? 'Single-name weight is high — many investors cap one stock well below half the book.'
                    : risk.top3Sum > 75
                    ? "A few names drive most of your risk — worth revisiting if that's unintentional."
                    : 'Concentration looks moderate for a typical direct-equity book. Revisit after big moves.'}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Corporate-style calendar (Yahoo quote fields; best-effort) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CalendarClockIcon className="size-4 text-primary" />
            <CardTitle className="text-sm sm:text-lg">On your book (next ~3 weeks)</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Earnings or dividend dates from Yahoo Finance when available — verify with the company / exchange.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bootstrapLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : bookEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming earnings/dividend dates surfaced for your holdings (or none in range). Add positions on{' '}
              <DashboardLink href="/portfolio" className="text-primary underline-offset-4 hover:underline">
                Portfolio
              </DashboardLink>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {bookEvents.map((ev, i) => (
                <li key={`${ev.symbol}-${ev.type}-${ev.date}-${i}`}>
                  <DashboardLink
                    href={`/stocks/${ev.symbol}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{ev.symbol}</span>
                      <span className="text-muted-foreground"> · {ev.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {ev.type}
                      </Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatYmdDisplay(ev.date)}
                      </span>
                    </div>
                  </DashboardLink>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-lg">What moved your portfolio</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Largest rupee contributors to today&apos;s change (absolute impact).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bootstrapLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : liveHoldings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to attribute yet.</p>
          ) : !quotesReady ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading live moves…
            </div>
          ) : movers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Flat day across your names so far.</p>
          ) : (
            <ul className="space-y-2">
              {movers.map((h) => {
                const share = totalDayMove !== 0 ? (h.day_change / totalDayMove) * 100 : 0;
                return (
                  <li key={h.id}>
                    <DashboardLink
                      href={`/stocks/${h.symbol.replace('.NS', '').replace('.BO', '')}`}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{h.symbol}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{h.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            'font-mono text-sm font-semibold tabular-nums',
                            h.day_change >= 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {formatInr(h.day_change)}
                        </p>
                        {Math.abs(share) > 5 && Number.isFinite(share) && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            ~{Math.abs(share).toFixed(0)}% of today&apos;s move
                          </p>
                        )}
                      </div>
                    </DashboardLink>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {!bootstrapLoading && workspace && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <JournalCard
              dateKey={journalDateKey}
              syncEnabled={syncEnabled}
              cloudInitial={workspace.journal}
            />
            <RemindersCard
              syncEnabled={syncEnabled}
              cloudInitial={workspace.reminders}
              bookEvents={bookEvents}
            />
          </div>
          <DigestCard syncEnabled={syncEnabled} initialEnabled={workspace.digest.emailEnabled} />
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <DashboardLink href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Full dashboard
        </DashboardLink>
        <DashboardLink href="/market" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Market overview
        </DashboardLink>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Educational snapshot only — not investment advice. Benchmarks and quotes can be delayed; verify with your
        broker before acting.
      </p>
    </div>
  );
}
