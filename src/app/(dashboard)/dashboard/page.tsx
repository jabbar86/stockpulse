'use client';

import { useEffect, useState, useMemo } from 'react';
import { DashboardLink } from '@/components/dashboard/dashboard-link';
import dynamic from 'next/dynamic';
import type {
  PortfolioSummary,
  HoldingWithMetrics,
  StrategySignal,
  StockRecommendation,
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  SunriseIcon,
  WifiIcon,
  WifiOffIcon,
  TargetIcon,
  LineChartIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  PieChartIcon,
  BarChart3Icon,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLivePrices } from '@/hooks/use-live-prices';

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketOverview {
  indices: MarketItem[];
  sectors?: Record<string, MarketItem[]>;
}

// Lazy load heavy components — Recharts (~200KB) and SmartInsights
const AllocationChart = dynamic(() => import('@/components/portfolio/allocation-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full" />,
});
const SmartInsights = dynamic(() => import('@/components/portfolio/smart-insights'), { ssr: false });
const InsightAlerts = dynamic(() => import('@/components/ai/insight-alerts'), { ssr: false });

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

const ALLOC_BAR_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#34d399',
  '#fb923c',
  '#f472b6',
  '#60a5fa',
] as const;

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [holdings, setHoldings] = useState<HoldingWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [marketData, setMarketData] = useState<MarketOverview | null>(null);

  // Get portfolio holding symbols for live streaming
  const holdingSymbols = useMemo(
    () => holdings.map((h) => h.symbol),
    [holdings]
  );

  const { getPrice, connected: liveConnected, lastUpdate: liveLastUpdate, marketStatus } = useLivePrices({
    symbols: holdingSymbols,
    enabled: holdingSymbols.length > 0,
  });

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const res = await fetch('/api/portfolio');
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary);
          setHoldings(data.holdings || []);
        }
        const [sigRes, recRes, mktRes] = await Promise.all([
          fetch('/api/market/signals'),
          fetch('/api/recommendations/stocks'),
          fetch('/api/market/overview'),
        ]);

        if (sigRes.ok) {
          const data = await sigRes.json();
          setSignals(data.signals || []);
        }

        if (recRes.ok) {
          const data = await recRes.json();
          setRecommendations(data.recommendations || []);
        }

        if (mktRes.ok) {
          const mkt = await mktRes.json();
          setMarketData(mkt);
        }
      } catch {
        // handle error silently
      } finally {
        setLoading(false);
      }
    }
    fetchPortfolio();
  }, []);

  // Merge live prices with holdings for real-time updates
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
        _direction: live.direction,
      };
    });
  }, [holdings, getPrice]);

  // Recompute summary from live holdings
  const liveSummary = useMemo(() => {
    if (!summary || liveHoldings.length === 0) return summary;
    const totalInvested = liveHoldings.reduce((sum, h) => sum + (h.avg_price * h.quantity), 0);
    const currentValue = liveHoldings.reduce((sum, h) => sum + h.current_value, 0);
    const totalPnl = currentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const dayChange = liveHoldings.reduce((sum, h) => sum + h.day_change, 0);
    const dayChangePercent = totalInvested > 0 ? (dayChange / totalInvested) * 100 : 0;
    const sorted = [...liveHoldings].sort((a, b) => b.pnl_percent - a.pnl_percent);
    return {
      ...summary,
      current_value: currentValue,
      total_pnl: totalPnl,
      total_pnl_percent: totalPnlPercent,
      day_change: dayChange,
      day_change_percent: dayChangePercent,
      top_gainers: sorted.filter((h) => h.pnl_percent > 0).slice(0, 5),
      top_losers: sorted.filter((h) => h.pnl_percent < 0).reverse().slice(0, 5),
    };
  }, [summary, liveHoldings]);

  const allocationData = liveHoldings.map((h) => ({
    name: h.symbol,
    value: h.current_value,
  }));

  const portfolioTotalValue = useMemo(
    () => liveHoldings.reduce((sum, h) => sum + h.current_value, 0),
    [liveHoldings]
  );
  const holdingsRows = useMemo(() => {
    return [...liveHoldings].sort((a, b) => b.current_value - a.current_value);
  }, [liveHoldings]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-7 sm:h-9 w-32" />
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-28 mt-2" />
                <Skeleton className="h-3 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <Skeleton className="h-[200px] sm:h-[300px] w-full" />
            </CardContent>
          </Card>
          <div className="space-y-3 sm:space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-3 sm:p-6 space-y-2">
                  <Skeleton className="h-5 w-28" />
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const s = liveSummary;
  const summaryCards = [
    {
      title: 'Total Value',
      value: s ? formatCurrency(s.current_value) : '--',
      subtitle: s ? `Invested: ${formatCurrency(s.total_invested)}` : '',
      icon: WalletIcon,
    },
    {
      title: 'Total P&L',
      value: s ? formatCurrency(s.total_pnl) : '--',
      subtitle: s ? formatPercent(s.total_pnl_percent) : '',
      icon: s && s.total_pnl >= 0 ? TrendingUpIcon : TrendingDownIcon,
      positive: s ? s.total_pnl >= 0 : true,
    },
    {
      title: 'Day Change',
      value: s ? formatCurrency(s.day_change) : '--',
      subtitle: s ? formatPercent(s.day_change_percent) : '',
      icon: SunriseIcon,
      positive: s ? s.day_change >= 0 : true,
    },
    {
      title: 'Best Performer',
      value:
        s && s.top_gainers.length > 0 ? s.top_gainers[0].symbol : '—',
      subtitle:
        s && s.top_gainers.length > 0
          ? formatCurrency(s.top_gainers[0].pnl)
          : s
            ? 'No gainers yet'
            : '',
      icon: TargetIcon,
      positive: s && s.top_gainers.length > 0 ? true : undefined,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Overview</h1>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Holdings, allocation, signals & picks — open{' '}
            <DashboardLink href="/today" className="font-medium text-primary underline-offset-4 hover:underline">
              Today
            </DashboardLink>{' '}
            for your brief or{' '}
            <DashboardLink
              href="/market"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Market
            </DashboardLink>{' '}
            for indices & ideas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {holdingSymbols.length > 0 &&
            (marketStatus.isOpen ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs',
                  liveConnected
                    ? 'bg-gain/15 text-gain'
                    : 'bg-amber-500/15 text-amber-600'
                )}
              >
                {liveConnected ? (
                  <>
                    <WifiIcon className="size-3" />
                    <span className="hidden sm:inline">Live</span>
                    <span className="size-1.5 rounded-full bg-gain live-dot" />
                  </>
                ) : (
                  <>
                    <WifiOffIcon className="size-3" />
                    <span className="hidden sm:inline">Connecting…</span>
                  </>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-600 sm:text-xs">
                <span className="size-1.5 rounded-full bg-orange-500" />
                <span className="hidden sm:inline">{marketStatus.message || 'Market closed'}</span>
                <span className="sm:hidden">Closed</span>
              </span>
            ))}
          {liveLastUpdate && (
            <span className="hidden text-[10px] text-muted-foreground sm:inline tabular-nums sm:text-xs">
              Updated {liveLastUpdate.toLocaleTimeString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards — gradient accent top bar for unique look */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          const valueColor =
            card.positive !== undefined
              ? card.positive
                ? 'text-gain'
                : 'text-loss'
              : '';
          const accentGradients = [
            'from-primary via-primary/70 to-chart-2',
            'from-gain via-gain/70 to-chart-2',
            'from-chart-5 via-chart-5/70 to-primary',
            'from-chart-4 via-primary to-chart-1',
          ];

          return (
            <Card key={card.title} className="stat-card-accent overflow-hidden">
              <div className={cn('h-1 w-full bg-gradient-to-r', accentGradients[idx % accentGradients.length])} />
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                    {card.title}
                  </p>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 sm:size-9">
                    <Icon className="size-4 text-primary sm:size-5" strokeWidth={1.75} />
                  </div>
                </div>
                <p
                  className={cn(
                    'mt-3 text-xl font-bold tabular-nums tracking-tight sm:text-2xl',
                    valueColor || 'text-foreground'
                  )}
                >
                  {card.value}
                </p>
                {card.subtitle && (
                  <p
                    className={cn(
                      'text-[11px] sm:text-sm mt-1 tabular-nums font-medium',
                      valueColor || 'text-muted-foreground'
                    )}
                  >
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Index Cards Row */}
      {marketData?.indices && marketData.indices.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {marketData.indices.slice(0, 4).map((idx) => {
            const isUp = idx.change >= 0;
            return (
              <Card key={idx.symbol} className="group">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                      {idx.name}
                    </p>
                    <span className={cn(
                      'inline-flex size-6 items-center justify-center rounded-md text-xs',
                      isUp ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'
                    )}>
                      {isUp ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold tabular-nums mt-1.5">
                    {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(idx.price)}
                  </p>
                  <p className={cn(
                    'text-[11px] sm:text-xs font-semibold tabular-nums mt-1',
                    isUp ? 'text-gain' : 'text-loss'
                  )}>
                    {isUp ? '+' : ''}{idx.change.toFixed(2)} ({isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%)
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Indices + Top Sectors row — matching reference */}
      {marketData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Indices list */}
          {marketData.indices.length > 4 && (
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3Icon className="size-4 text-primary" />
                  Indices
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-0">
                  {marketData.indices.slice(4).map((idx) => {
                    const isUp = idx.change >= 0;
                    return (
                      <div key={idx.symbol} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{idx.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{idx.symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm tabular-nums font-medium">
                            {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(idx.price)}
                          </p>
                          <p className={cn('text-xs tabular-nums', isUp ? 'text-gain' : 'text-loss')}>
                            {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Sectors */}
          {marketData.sectors && Object.keys(marketData.sectors).length > 0 && (
            <Card>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3Icon className="size-4 text-primary" />
                  Top Sectors
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-0">
                  {Object.entries(marketData.sectors)
                    .map(([name, stocks]) => ({
                      name,
                      avgChange: stocks.length > 0
                        ? stocks.reduce((s, st) => s + st.changePercent, 0) / stocks.length
                        : 0,
                      price: stocks.length > 0
                        ? stocks.reduce((s, st) => s + st.price, 0) / stocks.length
                        : 0,
                    }))
                    .sort((a, b) => Math.abs(b.avgChange) - Math.abs(a.avgChange))
                    .slice(0, 6)
                    .map((sector) => {
                      const isUp = sector.avgChange >= 0;
                      return (
                        <div key={sector.name} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'size-2 rounded-full',
                              isUp ? 'bg-gain' : 'bg-loss'
                            )} />
                            <p className="text-sm font-medium">{sector.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm tabular-nums">
                              {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(sector.price)}
                            </p>
                            <p className={cn('text-xs tabular-nums', isUp ? 'text-gain' : 'text-loss')}>
                              {isUp ? '+' : ''}{sector.avgChange.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Smart Insights */}
      {liveHoldings.length > 0 && <SmartInsights holdings={liveHoldings} />}

      {/* AI Insight Alerts */}
      {liveHoldings.length > 0 && <InsightAlerts holdings={liveHoldings} />}

      {/* Strategy Signals & Recommendations */}
      {(signals.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {signals.length > 0 && (
            <Card>
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-2">
                <CardTitle className="text-sm sm:text-lg">
                  Today&apos;s Strategy Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
                <div className="space-y-1.5 sm:space-y-2">
                  {signals.slice(0, 5).map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-start justify-between rounded-lg border p-2.5 sm:p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm">
                          {sig.symbol}{' '}
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            · {sig.strategy_name}
                          </span>
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                          {sig.reason}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-[10px] sm:text-xs uppercase font-semibold">
                          {sig.direction === 'buy'
                            ? 'BUY'
                            : sig.direction === 'sell'
                            ? 'SELL'
                            : 'EXIT'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 tabular-nums">
                          Entry ~ {sig.entry.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {recommendations.length > 0 && (
            <Card>
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-2">
                <CardTitle className="text-sm sm:text-lg">
                  Watchlist Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
                <div className="space-y-1.5 sm:space-y-2">
                  {recommendations.slice(0, 5).map((rec) => (
                    <div
                      key={`${rec.symbol}-${rec.generated_at}`}
                      className="flex items-start justify-between rounded-lg border p-2.5 sm:p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm">
                          {rec.symbol}{' '}
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            · {rec.action.toUpperCase()}
                          </span>
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                          {rec.reason}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-[10px] sm:text-xs tabular-nums">
                          Entry ~ {rec.entry.toFixed(2)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
                          SL {rec.stop_loss.toFixed(2)} · TP {rec.target.toFixed(2)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                          Conviction {rec.conviction}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Holdings — StockPulse-style table + allocation strip */}
      {liveHoldings.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 border-b border-border/50 px-4 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20 sm:size-12">
                <WalletIcon className="size-5 text-primary-foreground sm:size-6" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl">Portfolio</CardTitle>
                <p className="text-sm text-muted-foreground">Your holdings</p>
              </div>
            </div>
            <DashboardLink
              href="/portfolio"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'h-9 w-full gap-2 rounded-xl border-border bg-muted/50 sm:w-auto'
              )}
            >
              <LineChartIcon className="size-4" />
              Analyze
            </DashboardLink>
          </CardHeader>
          <CardContent className="space-y-6 px-0 pb-5 pt-0 sm:px-6 sm:pb-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 sm:px-0">Stock</th>
                    <th className="px-4 py-3 text-right sm:px-0">Qty</th>
                    <th className="hidden py-3 text-right sm:table-cell sm:px-0">Avg price</th>
                    <th className="px-4 py-3 text-right sm:px-0">LTP</th>
                    <th className="px-4 py-3 text-right sm:px-0">Change</th>
                    <th className="px-4 py-3 text-right sm:px-0">P&L</th>
                    <th className="px-4 py-3 text-right sm:px-0">Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {holdingsRows.map((h, rowIdx) => {
                    const pnlUp = h.pnl >= 0;
                    const pnlColor = pnlUp ? 'text-gain' : 'text-loss';
                    const dayUp = h.day_change_percent >= 0;
                    const flashClass =
                      (h as { _direction?: string })._direction === 'up'
                        ? 'animate-flash-green'
                        : (h as { _direction?: string })._direction === 'down'
                          ? 'animate-flash-red'
                          : '';
                    const allocPct =
                      portfolioTotalValue > 0
                        ? (h.current_value / portfolioTotalValue) * 100
                        : 0;
                    const barColor =
                      ALLOC_BAR_COLORS[rowIdx % ALLOC_BAR_COLORS.length];
                    return (
                      <tr
                        key={h.id}
                        className={cn(
                          'border-b border-border/50 transition-colors last:border-0 hover:bg-primary/[0.06]',
                          flashClass
                        )}
                      >
                        <td className="px-4 py-3 sm:px-0 sm:py-3.5">
                          <p className="text-sm font-bold tracking-tight">{h.symbol}</p>
                          <p className="max-w-[140px] truncate text-[11px] text-muted-foreground sm:max-w-[200px]">
                            {h.name}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums sm:px-0 sm:py-3.5">
                          {h.quantity}
                        </td>
                        <td className="hidden py-3.5 text-right text-sm tabular-nums sm:table-cell">
                          {formatCurrency(h.avg_price)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums sm:px-0 sm:py-3.5">
                          {formatCurrency(h.current_price)}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-0 sm:py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center justify-end gap-0.5 text-sm font-semibold tabular-nums',
                              dayUp ? 'text-gain' : 'text-loss'
                            )}
                          >
                            {dayUp ? (
                              <ArrowUpRightIcon className="size-3.5 shrink-0" />
                            ) : (
                              <ArrowDownRightIcon className="size-3.5 shrink-0" />
                            )}
                            {formatPercent(h.day_change_percent)}
                          </span>
                        </td>
                        <td className={cn('px-4 py-3 text-right sm:px-0 sm:py-3.5', pnlColor)}>
                          <div className="text-sm font-semibold tabular-nums">
                            {formatCurrency(h.pnl)}
                          </div>
                          <div className="text-[11px] font-medium tabular-nums opacity-90">
                            {formatPercent(h.pnl_percent)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right sm:px-0 sm:py-3.5">
                          <div className="inline-flex items-center justify-end gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:w-14">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.round(allocPct))}%`,
                                  backgroundColor: barColor,
                                }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs font-medium tabular-nums text-foreground">
                              {allocPct < 10 ? allocPct.toFixed(1) : Math.round(allocPct)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mx-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4 sm:mx-0">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <PieChartIcon className="size-3.5" />
                Allocation
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {holdingsRows.map((h, i) => {
                  const pct =
                    portfolioTotalValue > 0
                      ? (h.current_value / portfolioTotalValue) * 100
                      : 0;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={h.id}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          ALLOC_BAR_COLORS[i % ALLOC_BAR_COLORS.length],
                      }}
                      title={`${h.symbol}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] sm:text-xs">
                {holdingsRows.map((h, i) => {
                  const pct =
                    portfolioTotalValue > 0
                      ? (h.current_value / portfolioTotalValue) * 100
                      : 0;
                  return (
                    <span
                      key={h.id}
                      className="inline-flex items-center gap-1.5 text-muted-foreground"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            ALLOC_BAR_COLORS[i % ALLOC_BAR_COLORS.length],
                        }}
                      />
                      <span className="font-medium text-foreground">{h.symbol}</span>
                      <span className="tabular-nums">({pct < 10 ? pct.toFixed(1) : Math.round(pct)}%)</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocation Chart and Top Movers */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Allocation Donut Chart */}
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-1">
            <CardTitle className="text-sm sm:text-lg">Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
            <AllocationChart data={allocationData} />
          </CardContent>
        </Card>

        {/* Top Gainers and Losers */}
        <div className="space-y-3 sm:space-y-4">
          {/* Top Gainers */}
          <Card>
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-1">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                <TrendingUpIcon className="text-gain size-4 sm:size-5" />
                Top Gainers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pb-2 sm:pb-6">
              {s && s.top_gainers.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {s.top_gainers.slice(0, 3).map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between rounded-lg border p-2.5 sm:p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-base">{stock.symbol}</p>
                        <p className="text-[10px] sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                          {stock.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-gain font-medium text-xs tabular-nums sm:text-base">
                          {formatCurrency(stock.pnl)}
                        </p>
                        <Badge className="bg-gain/15 text-gain text-[10px] sm:text-xs">
                          {formatPercent(stock.pnl_percent)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center">No gainers yet</p>
              )}
            </CardContent>
          </Card>

          {/* Top Losers */}
          <Card>
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-1">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                <TrendingDownIcon className="text-loss size-4 sm:size-5" />
                Top Losers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pb-2 sm:pb-6">
              {s && s.top_losers.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {s.top_losers.slice(0, 3).map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between rounded-lg border p-2.5 sm:p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-base">{stock.symbol}</p>
                        <p className="text-[10px] sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                          {stock.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-loss font-medium text-xs tabular-nums sm:text-base">
                          {formatCurrency(stock.pnl)}
                        </p>
                        <Badge className="bg-loss/15 text-loss text-[10px] sm:text-xs">
                          {formatPercent(stock.pnl_percent)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center">No losers</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
