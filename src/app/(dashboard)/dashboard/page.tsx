'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import SmartInsights from '@/components/portfolio/smart-insights';

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

  const allocationData = holdings.map((h) => ({
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

  const summaryCards = [
    {
      title: 'Total Value',
      value: summary ? formatCurrency(summary.current_value) : '--',
      subtitle: summary ? `Invested: ${formatCurrency(summary.total_invested)}` : '',
      icon: WalletIcon,
    },
    {
      title: 'Total P&L',
      value: summary ? formatCurrency(summary.total_pnl) : '--',
      subtitle: summary ? formatPercent(summary.total_pnl_percent) : '',
      icon: summary && summary.total_pnl >= 0 ? TrendingUpIcon : TrendingDownIcon,
      positive: summary ? summary.total_pnl >= 0 : true,
    },
    {
      title: 'Day Change',
      value: summary ? formatCurrency(summary.day_change) : '--',
      subtitle: summary ? formatPercent(summary.day_change_percent) : '',
      icon: SunriseIcon,
      positive: summary ? summary.day_change >= 0 : true,
    },
    {
      title: 'Holdings',
      value: summary ? String(summary.holdings_count) : '0',
      subtitle: 'Stocks in portfolio',
      icon: LayersIcon,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-lg sm:text-3xl font-bold">Dashboard</h1>

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
      {holdings.length > 0 && <SmartInsights holdings={holdings} />}

      {/* Holdings Overview */}
      {holdings.length > 0 && (
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
                  {[...holdings]
                    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
                    .map((h) => {
                      const isPositive = h.pnl >= 0;
                      const color = isPositive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400';
                      return (
                        <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
              {summary && summary.top_gainers.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {summary.top_gainers.slice(0, 3).map((stock) => (
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
              {summary && summary.top_losers.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {summary.top_losers.slice(0, 3).map((stock) => (
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
