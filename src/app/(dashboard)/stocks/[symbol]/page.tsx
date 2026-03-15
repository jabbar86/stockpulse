'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type {
  CombinedAnalysis,
  AIAnalysis,
  HistoricalDataPoint,
  StockQuote,
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import IndicatorCard from '@/components/stocks/indicator-card';
import AIAnalysisCard from '@/components/stocks/ai-analysis-card';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowLeftIcon,
  BarChart3Icon,
} from 'lucide-react';
import Link from 'next/link';

const CandlestickChart = dynamic(() => import('@/components/stocks/candlestick-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
});

type Period = '1M' | '3M' | '6M' | '1Y';

function getSignalConfig(signal: string) {
  switch (signal) {
    case 'strong_buy':
      return { label: 'Strong Buy', className: 'bg-green-600 text-white' };
    case 'buy':
      return { label: 'Buy', className: 'bg-green-500/10 text-green-600 dark:text-green-400' };
    case 'neutral':
    case 'hold':
      return { label: 'Neutral', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
    case 'sell':
      return { label: 'Sell', className: 'bg-red-500/10 text-red-600 dark:text-red-400' };
    case 'strong_sell':
      return { label: 'Strong Sell', className: 'bg-red-600 text-white' };
    default:
      return { label: signal, className: 'bg-muted text-muted-foreground' };
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function StockAnalysisPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol?.toUpperCase() || '';

  const [analysis, setAnalysis] = useState<CombinedAnalysis | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('3M');

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    async function fetchAnalysis() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/${symbol}/analysis?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          setAnalysis(data.analysis || data);
          setHistoricalData(data.historicalData || data.historical_data || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [symbol, period]);

  const handleAiAnalyze = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/stocks/${symbol}/ai-analysis`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.analysis || data);
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-24" />
        </div>
        <Skeleton className="h-[400px] w-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const priceChange = analysis?.current_price
    ? analysis.current_price - (analysis.technical?.sma?.sma20 || analysis.current_price)
    : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/stocks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Stocks
      </Link>

      {/* Price Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{analysis?.name || symbol}</h1>
          <Badge variant="outline">{symbol}</Badge>
          {analysis?.technical?.overallSignal && (
            <Badge className={getSignalConfig(analysis.technical.overallSignal).className}>
              {getSignalConfig(analysis.technical.overallSignal).label}
            </Badge>
          )}
        </div>
        {analysis?.current_price !== undefined && (
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">{formatCurrency(analysis.current_price)}</span>
            <div
              className={`flex items-center gap-1 text-lg font-medium ${
                isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <TrendingUpIcon className="size-5" />
              ) : (
                <TrendingDownIcon className="size-5" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Period Selector and Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="size-5" />
              Price Chart
            </CardTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="1M">1M</TabsTrigger>
                <TabsTrigger value="3M">3M</TabsTrigger>
                <TabsTrigger value="6M">6M</TabsTrigger>
                <TabsTrigger value="1Y">1Y</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {historicalData.length > 0 ? (
            <CandlestickChart data={historicalData} />
          ) : (
            <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
              No chart data available for this period.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Indicators */}
      {analysis?.technical && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Technical Indicators</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* RSI */}
            <IndicatorCard
              title="RSI (14)"
              value={analysis.technical.rsi.value}
              signal={analysis.technical.rsi.signal}
              description={
                analysis.technical.rsi.value > 70
                  ? 'Stock may be overbought'
                  : analysis.technical.rsi.value < 30
                  ? 'Stock may be oversold'
                  : 'RSI is in neutral zone'
              }
            />

            {/* MACD */}
            <IndicatorCard
              title="MACD"
              value={analysis.technical.macd.histogram}
              signal={analysis.technical.macd.trend}
              description={`MACD: ${analysis.technical.macd.macd.toFixed(2)} | Signal: ${analysis.technical.macd.signal.toFixed(2)}`}
            />

            {/* Bollinger Bands */}
            <IndicatorCard
              title="Bollinger Bands"
              value={`${analysis.technical.bollingerBands.lower.toFixed(0)} - ${analysis.technical.bollingerBands.upper.toFixed(0)}`}
              signal={analysis.technical.bollingerBands.position}
              description={`Middle: ${analysis.technical.bollingerBands.middle.toFixed(2)}`}
            />

            {/* Overall Score */}
            <Card size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Technical Score
                  </CardTitle>
                  <Badge
                    className={getSignalConfig(analysis.technical.overallSignal).className}
                  >
                    {getSignalConfig(analysis.technical.overallSignal).label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{analysis.technical.score}</p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.technical.score > 0
                        ? 'bg-green-500'
                        : analysis.technical.score < 0
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.abs(analysis.technical.score) / 2 + 50}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Scale: -100 (Strong Sell) to +100 (Strong Buy)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* SMA/EMA Levels */}
          <Card>
            <CardHeader>
              <CardTitle>Moving Averages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">SMA 20</p>
                  <p className="text-lg font-semibold">
                    {analysis.technical.sma.sma20.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">SMA 50</p>
                  <p className="text-lg font-semibold">
                    {analysis.technical.sma.sma50.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">SMA 200</p>
                  <p className="text-lg font-semibold">
                    {analysis.technical.sma.sma200.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">EMA 12</p>
                  <p className="text-lg font-semibold">
                    {analysis.technical.ema.ema12.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">EMA 26</p>
                  <p className="text-lg font-semibold">
                    {analysis.technical.ema.ema26.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Analysis */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">AI Analysis</h2>
        <AIAnalysisCard
          analysis={aiAnalysis || analysis?.ai || null}
          loading={aiLoading}
          onAnalyze={handleAiAnalyze}
        />
      </div>
    </div>
  );
}
