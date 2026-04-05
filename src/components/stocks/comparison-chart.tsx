'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { GitCompareIcon } from 'lucide-react';

interface ComparisonChartProps {
  symbol: string;
  period?: string;
}

interface ChartPoint {
  date: string;
  [key: string]: number | string;
}

const COMPARISONS = ['^NSEI'] as const;

const COLORS = ['hsl(160, 84%, 39%)', 'hsl(220, 70%, 50%)', 'hsl(0, 70%, 50%)'];

export function ComparisonChart({ symbol, period = '3mo' }: ComparisonChartProps) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareSymbol, setCompareSymbol] = useState<string>('^NSEI');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [stockRes, benchRes] = await Promise.all([
          fetch(`/api/stocks/${symbol}/historical?period=${period}`),
          fetch(`/api/stocks/${compareSymbol.replace('^', '')}/historical?period=${period}`),
        ]);

        if (!stockRes.ok || !benchRes.ok) {
          setError('Could not fetch comparison data');
          return;
        }

        const stockData = await stockRes.json();
        const benchData = await benchRes.json();

        const stockPrices = stockData.data || stockData;
        const benchPrices = benchData.data || benchData;

        if (!Array.isArray(stockPrices) || !Array.isArray(benchPrices) || stockPrices.length === 0) {
          setError('Insufficient data for comparison');
          return;
        }

        if (cancelled) return;

        // Normalize both to % change from first price
        const stockBase = stockPrices[0].close;
        const benchBase = benchPrices[0]?.close || 1;

        const benchMap = new Map(
          benchPrices.map((d: { date: string; close: number }) => [d.date, d.close])
        );

        const normalized: ChartPoint[] = stockPrices.map((d: { date: string; close: number }) => {
          const benchClose = benchMap.get(d.date);
          return {
            date: d.date,
            [symbol]: Math.round(((d.close - stockBase) / stockBase) * 10000) / 100,
            ...(benchClose !== undefined
              ? { [compareSymbol]: Math.round(((benchClose - benchBase) / benchBase) * 10000) / 100 }
              : {}),
          };
        });

        setData(normalized);
      } catch {
        setError('Failed to load comparison');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [symbol, compareSymbol, period]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
            <GitCompareIcon className="size-4 text-primary" />
            Performance Comparison
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={compareSymbol === '^NSEI' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCompareSymbol('^NSEI')}
            >
              vs NIFTY
            </Button>
            <Button
              variant={compareSymbol === '^BSESN' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCompareSymbol('^BSESN')}
            >
              vs SENSEX
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : error ? (
          <p className="text-sm text-muted-foreground text-center py-8">{error}</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(d) => {
                  const date = new Date(d);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
                width={45}
              />
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(2)}%`}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={symbol}
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={compareSymbol}
                stroke={COLORS[1]}
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
