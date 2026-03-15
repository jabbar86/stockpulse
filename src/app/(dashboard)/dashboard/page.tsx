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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Chart and Lists Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${valueColor}`}>{card.value}</p>
                {card.subtitle && (
                  <p className={`text-xs mt-1 ${valueColor || 'text-muted-foreground'}`}>
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Allocation Chart and Top Movers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Allocation Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {allocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
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
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No holdings to display.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Gainers and Losers */}
        <div className="space-y-4">
          {/* Top Gainers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="size-4 text-green-500" />
                Top Gainers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary && summary.top_gainers.length > 0 ? (
                <div className="space-y-2">
                  {summary.top_gainers.slice(0, 3).map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{stock.symbol}</p>
                        <p className="text-xs text-muted-foreground">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(stock.pnl)}
                        </p>
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                          {formatPercent(stock.pnl_percent)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No gainers yet</p>
              )}
            </CardContent>
          </Card>

          {/* Top Losers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDownIcon className="size-4 text-red-500" />
                Top Losers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary && summary.top_losers.length > 0 ? (
                <div className="space-y-2">
                  {summary.top_losers.slice(0, 3).map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{stock.symbol}</p>
                        <p className="text-xs text-muted-foreground">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(stock.pnl)}
                        </p>
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">
                          {formatPercent(stock.pnl_percent)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No losers</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
