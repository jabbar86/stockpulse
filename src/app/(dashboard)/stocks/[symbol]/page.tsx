'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IndicatorCard from '@/components/stocks/indicator-card';
import AIAnalysisCard from '@/components/stocks/ai-analysis-card';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  WifiIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useLivePrices } from '@/hooks/use-live-prices';

const CandlestickChart = dynamic(() => import('@/components/stocks/candlestick-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
});

type Period = '1m' | '5m' | '1H' | '5D' | '1M' | '3M' | '6M' | '1Y';

const PERIOD_MAP: Record<Period, string> = {
  '1m': '1d_1m',
  '5m': '1d_5m',
  '1H': '1d_1h',
  '5D': '5d',
  '1M': '1mo',
  '3M': '3mo',
  '6M': '6mo',
  '1Y': '1y',
};

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
  const searchParams = useSearchParams();
  const symbol = params.symbol?.toUpperCase() || '';
  const exchange = searchParams.get('exchange') || '';

  const [analysis, setAnalysis] = useState<CombinedAnalysis | null>(null);
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('5D');

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Live price stream — only during market hours
  const symbolsForStream = symbol ? [symbol] : [];
  const { getPrice, marketStatus } = useLivePrices({ symbols: symbolsForStream, enabled: !!symbol });
  const isMarketOpen = marketStatus.isOpen;
  const live = isMarketOpen ? getPrice(symbol) : undefined;

  // Cache chart data per period to avoid refetching
  const chartCache = useRef<Map<string, HistoricalDataPoint[]>>(new Map());

  // Fetch chart data for a given period (with client-side cache)
  const fetchChartData = useCallback(async (p: Period) => {
    if (!symbol) return;
    const yahooPeriod = PERIOD_MAP[p];

    const cached = chartCache.current.get(yahooPeriod);
    if (cached) {
      setHistoricalData(cached);
      return;
    }

    setChartLoading(true);
    try {
      const exchangeParam = exchange ? `&exchange=${exchange}` : '';
      const res = await fetch(`/api/stocks/historical?symbol=${symbol}&period=${yahooPeriod}${exchangeParam}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        chartCache.current.set(yahooPeriod, data);
        setHistoricalData(data);
      }
    } catch {
      // silently fail
    } finally {
      setChartLoading(false);
    }
  }, [symbol, exchange]);

  // Fetch quote+technical and chart data in parallel on mount
  useEffect(() => {
    if (!symbol) return;

    async function fetchAll() {
      setLoading(true);
      setChartLoading(true);

      const exchangeParam = exchange ? `&exchange=${exchange}` : '';

      // Fire both requests in parallel
      const [analysisRes, chartRes] = await Promise.allSettled([
        fetch(`/api/stocks/${symbol}/analysis?${exchangeParam ? `exchange=${exchange}` : ''}`),
        fetch(`/api/stocks/historical?symbol=${symbol}&period=${PERIOD_MAP[period]}${exchangeParam}`),
      ]);

      // Handle analysis response
      if (analysisRes.status === 'fulfilled' && analysisRes.value.ok) {
        const data = await analysisRes.value.json();
        setAnalysis({
          symbol: data.symbol,
          name: data.name || data.quote?.name || symbol,
          current_price: data.current_price ?? data.quote?.price ?? 0,
          technical: data.technical,
          recommendation: data.recommendation || data.technical?.overallSignal || 'neutral',
          confidence: data.confidence ?? Math.abs(data.technical?.score ?? 0),
          analyzed_at: data.analyzed_at || new Date().toISOString(),
        });
        setStockQuote(data.quote || null);
      }

      // Handle chart response
      if (chartRes.status === 'fulfilled' && chartRes.value.ok) {
        const json = await chartRes.value.json();
        const chartData = json.data || [];
        chartCache.current.set(PERIOD_MAP[period], chartData);
        setHistoricalData(chartData);
      }

      setLoading(false);
      setChartLoading(false);
    }

    fetchAll();
  }, [symbol, exchange]); // eslint-disable-line react-hooks/exhaustive-deps

  // When period changes after initial load, only fetch chart data
  const initialLoad = useRef(true);
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }
    fetchChartData(period);
  }, [period, fetchChartData]);

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

  const currentPrice = live?.price ?? analysis?.current_price ?? 0;
  const priceChange = live?.change ?? stockQuote?.change ?? 0;
  const priceChangePercent = live?.changePercent ?? stockQuote?.changePercent ?? 0;
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
        {currentPrice > 0 && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold tabular-nums">{formatCurrency(currentPrice)}</span>
              {isMarketOpen && live ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <WifiIcon className="size-3" />
                  <span className="animate-pulse">Live</span>
                </span>
              ) : !isMarketOpen ? (
                <span className="text-xs text-muted-foreground">Market Closed</span>
              ) : null}
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
                <span>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            {stockQuote && (
              <div className="space-y-3">
                {/* Day Range Bar */}
                {stockQuote.dayLow > 0 && stockQuote.dayHigh > 0 && (
                  <div className="max-w-sm">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Day Low</span>
                      <span>Day High</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 dark:from-red-500 dark:via-yellow-500 dark:to-green-500">
                      {(() => {
                        const range = stockQuote.dayHigh - stockQuote.dayLow;
                        const position = range > 0
                          ? ((currentPrice - stockQuote.dayLow) / range) * 100
                          : 50;
                        return (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-foreground border-2 border-background shadow-md"
                            style={{ left: `calc(${Math.max(0, Math.min(100, position))}% - 7px)` }}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-xs font-medium mt-1 tabular-nums">
                      <span>{formatCurrency(stockQuote.dayLow)}</span>
                      <span>{formatCurrency(stockQuote.dayHigh)}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {stockQuote.open > 0 && <span>Open: {formatCurrency(stockQuote.open)}</span>}
                  {stockQuote.previousClose > 0 && <span>Prev Close: {formatCurrency(stockQuote.previousClose)}</span>}
                  {stockQuote.volume > 0 && <span>Vol: {(stockQuote.volume / 1e6).toFixed(2)}M</span>}
                </div>
              </div>
            )}
          </>
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
              <TabsList className="flex-wrap h-auto gap-0.5">
                <TabsTrigger value="1m" className="text-xs px-2 h-7">1m</TabsTrigger>
                <TabsTrigger value="5m" className="text-xs px-2 h-7">5m</TabsTrigger>
                <TabsTrigger value="1H" className="text-xs px-2 h-7">1H</TabsTrigger>
                <TabsTrigger value="5D" className="text-xs px-2 h-7">5D</TabsTrigger>
                <TabsTrigger value="1M" className="text-xs px-2 h-7">1M</TabsTrigger>
                <TabsTrigger value="3M" className="text-xs px-2 h-7">3M</TabsTrigger>
                <TabsTrigger value="6M" className="text-xs px-2 h-7">6M</TabsTrigger>
                <TabsTrigger value="1Y" className="text-xs px-2 h-7">1Y</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : historicalData.length > 0 ? (
            <CandlestickChart data={historicalData} livePrice={live?.price} liveVolume={live?.volume} />
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
