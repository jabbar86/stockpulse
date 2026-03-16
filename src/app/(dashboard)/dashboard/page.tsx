'use client';

import { useEffect, useState, useMemo } from 'react';
import type { PortfolioSummary, HoldingWithMetrics } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  SunriseIcon,
  LayersIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import SmartInsights from '@/components/portfolio/smart-insights';
import { useLivePrices } from '@/hooks/use-live-prices';

const CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
];

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

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [holdings, setHoldings] = useState<HoldingWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);

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
      title: 'Holdings',
      value: s ? String(s.holdings_count) : '0',
      subtitle: 'Stocks in portfolio',
      icon: LayersIcon,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg sm:text-3xl font-bold">Dashboard</h1>
        {holdingSymbols.length > 0 && (
          marketStatus.isOpen ? (
            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full ${
              liveConnected
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
            }`}>
              {liveConnected ? (
                <>
                  <WifiIcon className="size-3" />
                  <span className="hidden sm:inline">Live</span>
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                </>
              ) : (
                <>
                  <WifiOffIcon className="size-3" />
                  <span className="hidden sm:inline">Connecting...</span>
                </>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <span className="size-1.5 rounded-full bg-orange-500" />
              <span className="hidden sm:inline">{marketStatus.message || 'Market Closed'}</span>
              <span className="sm:hidden">Closed</span>
            </span>
          )
        )}
        {liveLastUpdate && (
          <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline ml-auto">
            Updated: {liveLastUpdate.toLocaleTimeString('en-IN')}
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const valueColor =
            card.positive !== undefined
              ? card.positive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
              : '';

          return (
            <Card key={card.title}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <Icon className="size-3.5 sm:size-5 text-muted-foreground" />
                </div>
                <p className={`text-base sm:text-2xl font-bold mt-1 tabular-nums ${valueColor}`}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p
                    className={`text-[10px] sm:text-sm mt-0.5 tabular-nums ${valueColor || 'text-muted-foreground'}`}
                  >
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Smart Insights */}
      {liveHoldings.length > 0 && <SmartInsights holdings={liveHoldings} />}

      {/* Holdings Overview */}
      {liveHoldings.length > 0 && (
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-2">
            <CardTitle className="text-sm sm:text-lg">Holdings Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-[10px] sm:text-xs text-muted-foreground">
                    <th className="px-3 sm:px-4 py-2 font-medium">Stock</th>
                    <th className="px-3 sm:px-4 py-2 font-medium text-right">Qty</th>
                    <th className="px-3 sm:px-4 py-2 font-medium text-right">Avg Price</th>
                    <th className="px-3 sm:px-4 py-2 font-medium text-right">LTP</th>
                    <th className="px-3 sm:px-4 py-2 font-medium text-right">P&L</th>
                    <th className="px-3 sm:px-4 py-2 font-medium text-right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {[...liveHoldings]
                    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
                    .map((h) => {
                      const isPositive = h.pnl >= 0;
                      const color = isPositive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400';
                      const flashClass = (h as any)._direction === 'up'
                        ? 'animate-flash-green'
                        : (h as any)._direction === 'down'
                        ? 'animate-flash-red'
                        : '';
                      return (
                        <tr key={h.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${flashClass}`}>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <p className="font-medium text-xs sm:text-sm">{h.symbol}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-[160px]">{h.name}</p>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-xs sm:text-sm tabular-nums">{h.quantity}</td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-xs sm:text-sm tabular-nums">{formatCurrency(h.avg_price)}</td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-xs sm:text-sm tabular-nums font-medium">{formatCurrency(h.current_price)}</td>
                          <td className={`px-3 sm:px-4 py-2.5 sm:py-3 text-right text-xs sm:text-sm tabular-nums font-semibold ${color}`}>
                            {formatCurrency(h.pnl)}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">
                            <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold tabular-nums ${
                              isPositive
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                              {formatPercent(h.pnl_percent)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
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
            {allocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {allocationData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-[10px] sm:text-sm text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] sm:h-[280px] items-center justify-center text-xs sm:text-base text-muted-foreground">
                No holdings to display.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Gainers and Losers */}
        <div className="space-y-3 sm:space-y-4">
          {/* Top Gainers */}
          <Card>
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-1">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                <TrendingUpIcon className="size-4 sm:size-5 text-green-500" />
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
                        <p className="font-medium text-xs sm:text-base text-green-600 dark:text-green-400 tabular-nums">
                          {formatCurrency(stock.pnl)}
                        </p>
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] sm:text-xs">
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
                <TrendingDownIcon className="size-4 sm:size-5 text-red-500" />
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
                        <p className="font-medium text-xs sm:text-base text-red-600 dark:text-red-400 tabular-nums">
                          {formatCurrency(stock.pnl)}
                        </p>
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] sm:text-xs">
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
