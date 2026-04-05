'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IndicatorCard from '@/components/stocks/indicator-card';
import AIAnalysisCard from '@/components/stocks/ai-analysis-card';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  WifiIcon,
  StarIcon,
  Loader2Icon,
} from 'lucide-react';
import { DashboardLink } from '@/components/dashboard/dashboard-link';
import { useLivePrices } from '@/hooks/use-live-prices';
import { StockChartSkeleton } from '@/components/stocks/stock-chart-skeleton';
import { StockAnalysisPageSkeleton } from '@/components/stocks/stock-page-skeleton';
import { ComparisonChart } from '@/components/stocks/comparison-chart';
import { FibonacciOverlay } from '@/components/stocks/fibonacci-overlay';
import { cn } from '@/lib/utils';

const CandlestickChart = dynamic(() => import('@/components/stocks/candlestick-chart'), {
  ssr: false,
  loading: () => <StockChartSkeleton />,
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
      return { label: 'Strong Buy', className: 'bg-primary text-primary-foreground' };
    case 'buy':
      return { label: 'Buy', className: 'bg-primary/12 text-primary' };
    case 'neutral':
    case 'hold':
      return { label: 'Neutral', className: 'bg-hold/15 text-hold' };
    case 'sell':
      return { label: 'Sell', className: 'bg-loss/12 text-loss' };
    case 'strong_sell':
      return { label: 'Strong Sell', className: 'bg-destructive text-destructive-foreground' };
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

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
        setAiAnalysis(data.ai || data.analysis || data);
      }
    } catch {
      // silently fail
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    async function fetchFav() {
      if (!symbol) return;
      try {
        const res = await fetch('/api/watchlist');
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items || []) as { symbol: string }[];
        setIsFavorite(items.some((i) => i.symbol.toUpperCase() === symbol));
      } catch {
        // ignore
      }
    }
    fetchFav();
  }, [symbol]);

  const suggestedActionLabel = useMemo(() => {
    const rec = analysis?.recommendation || aiAnalysis?.recommendation;
    if (!rec) return 'No clear signal';
    switch (rec) {
      case 'strong_buy':
        return 'Strong Buy';
      case 'buy':
        return 'Buy';
      case 'sell':
        return 'Sell';
      case 'strong_sell':
        return 'Strong Sell';
      default:
        return 'Hold';
    }
  }, [analysis, aiAnalysis]);

  const handleToggleFavorite = async () => {
    if (!symbol || !analysis) return;
    setFavLoading(true);
    try {
      if (isFavorite) {
        const res = await fetch(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' });
        if (res.ok) {
          setIsFavorite(false);
        }
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            name: analysis.name || symbol,
            exchange: (stockQuote?.symbol?.endsWith('.BO') ? 'BSE' : 'NSE') as 'NSE' | 'BSE',
          }),
        });
        if (res.ok) {
          setIsFavorite(true);
        }
      }
    } catch {
      // ignore
    } finally {
      setFavLoading(false);
    }
  };

  if (loading) {
    return <StockAnalysisPageSkeleton />;
  }

  const currentPrice = live?.price ?? analysis?.current_price ?? 0;
  const priceChange = live?.change ?? stockQuote?.change ?? 0;
  const priceChangePercent = live?.changePercent ?? stockQuote?.changePercent ?? 0;
  const isPositive = priceChange >= 0;

  const analysisMissing = !analysis && !loading;

  return (
    <div className="space-y-10">
      <DashboardLink
        href="/stocks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to stocks
      </DashboardLink>

      {analysisMissing && (
        <p className="border-l-2 border-primary pl-3 text-sm text-muted-foreground" role="status">
          Quote or analysis unavailable for{' '}
          <span className="font-mono text-foreground">{symbol}</span>. Try another timeframe or{' '}
          <DashboardLink href="/stocks" className="text-foreground underline underline-offset-2">
            choose another symbol
          </DashboardLink>
          .
        </p>
      )}

      <div className="space-y-4 border-b border-border pb-8">
        <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {analysis?.name || symbol}
              </h1>
              <Badge variant="outline" className="shrink-0 font-mono text-[11px] font-normal">
                {symbol}
              </Badge>
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favLoading || !analysis}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                  !analysis && 'cursor-not-allowed opacity-50',
                  isFavorite
                    ? 'border-foreground/20 bg-muted text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                {favLoading ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <StarIcon
                    className={cn(
                      'size-3.5',
                      isFavorite ? 'fill-primary/25 stroke-primary' : ''
                    )}
                  />
                )}
                <span className="hidden sm:inline">{isFavorite ? 'Saved' : 'Save'}</span>
              </button>
              {analysis?.technical?.overallSignal && (
                <Badge className={getSignalConfig(analysis.technical.overallSignal).className}>
                  {getSignalConfig(analysis.technical.overallSignal).label}
                </Badge>
              )}
            </div>

            {currentPrice > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-6">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
                    {formatCurrency(currentPrice)}
                  </span>
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-base font-medium tabular-nums',
                      isPositive ? 'text-gain' : 'text-loss'
                    )}
                  >
                    {isPositive ? <TrendingUpIcon className="size-4" /> : <TrendingDownIcon className="size-4" />}
                    <span>
                      {isPositive ? '+' : ''}
                      {priceChange.toFixed(2)} ({isPositive ? '+' : ''}
                      {priceChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isMarketOpen && live ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-gain" />
                      Live
                      <WifiIcon className="size-3 opacity-70" />
                    </span>
                  ) : !isMarketOpen ? (
                    <span>Session closed</span>
                  ) : null}
                </div>
              </div>
            )}

            {currentPrice <= 0 && !analysisMissing && (
              <p className="text-sm text-muted-foreground">Waiting for price…</p>
            )}

            {stockQuote && currentPrice > 0 && (
              <div className="space-y-3 pt-1">
                {stockQuote.dayLow > 0 && stockQuote.dayHigh > 0 && (
                  <div className="max-w-md">
                    <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                    <div className="relative h-2 rounded-sm bg-muted">
                      <div
                        className="absolute inset-y-0 rounded-sm bg-gradient-to-r from-loss/35 via-hold/25 to-gain/35"
                        style={{ width: '100%' }}
                      />
                      {(() => {
                        const range = stockQuote.dayHigh - stockQuote.dayLow;
                        const position =
                          range > 0 ? ((currentPrice - stockQuote.dayLow) / range) * 100 : 50;
                        return (
                          <div
                            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-background bg-foreground"
                            style={{ left: `calc(${Math.max(0, Math.min(100, position))}% - 6px)` }}
                          />
                        );
                      })()}
                    </div>
                    <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
                      <span>{formatCurrency(stockQuote.dayLow)}</span>
                      <span>{formatCurrency(stockQuote.dayHigh)}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  {stockQuote.open > 0 && <span>O {formatCurrency(stockQuote.open)}</span>}
                  {stockQuote.previousClose > 0 && <span>Prev {formatCurrency(stockQuote.previousClose)}</span>}
                  {stockQuote.volume > 0 && <span>Vol {(stockQuote.volume / 1e6).toFixed(2)}M</span>}
                </div>
              </div>
            )}
          </div>
      </div>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chart</p>
              <CardTitle className="mt-1 flex items-center gap-2 text-base font-medium">
                <BarChart3Icon className="size-4 text-muted-foreground" />
                OHLC
              </CardTitle>
            </div>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-0 p-0 lg:w-auto">
                <TabsTrigger value="1m" className="px-2.5 py-1.5 text-xs">
                  1m
                </TabsTrigger>
                <TabsTrigger value="5m" className="px-2.5 py-1.5 text-xs">
                  5m
                </TabsTrigger>
                <TabsTrigger value="1H" className="px-2.5 py-1.5 text-xs">
                  1H
                </TabsTrigger>
                <TabsTrigger value="5D" className="px-2.5 py-1.5 text-xs">
                  5D
                </TabsTrigger>
                <TabsTrigger value="1M" className="px-2.5 py-1.5 text-xs">
                  1M
                </TabsTrigger>
                <TabsTrigger value="3M" className="px-2.5 py-1.5 text-xs">
                  3M
                </TabsTrigger>
                <TabsTrigger value="6M" className="px-2.5 py-1.5 text-xs">
                  6M
                </TabsTrigger>
                <TabsTrigger value="1Y" className="px-2.5 py-1.5 text-xs">
                  1Y
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {chartLoading ? (
            <StockChartSkeleton />
          ) : historicalData.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <CandlestickChart data={historicalData} livePrice={live?.price} liveVolume={live?.volume} />
            </div>
          ) : (
            <div className="flex h-[400px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 text-center">
              <BarChart3Icon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No data for this range.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {(analysis || aiAnalysis) && (
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Signal</CardTitle>
            <p className="text-xs text-muted-foreground">
              From technicals{aiAnalysis ? ' and AI' : ''}.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-lg font-semibold sm:text-xl">{suggestedActionLabel}</p>
              {aiAnalysis?.confidence !== undefined && (
                <div className="text-right text-sm tabular-nums">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{aiAnalysis.confidence}%</p>
                </div>
              )}
            </div>
            {aiAnalysis?.summary && (
              <p className="text-sm text-muted-foreground line-clamp-4">{aiAnalysis.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {analysis?.technical && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-medium">Indicators</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">RSI, MACD, Bollinger, score.</p>
          </div>

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

            {/* ATR */}
            {analysis.technical.atr !== undefined && (
              <IndicatorCard
                title="ATR (14)"
                value={analysis.technical.atr}
                signal="neutral"
                description="Average True Range — volatility measure"
              />
            )}

            <Card size="sm" className="border-border shadow-none">
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
                        ? 'bg-gain'
                        : analysis.technical.score < 0
                        ? 'bg-loss'
                        : 'bg-hold'
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

          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-medium">Moving averages</CardTitle>
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
                {analysis.technical.vwap !== undefined && (
                  <div className="rounded-lg border p-3 text-center bg-primary/5">
                    <p className="text-xs text-muted-foreground">VWAP</p>
                    <p className="text-lg font-semibold">
                      {analysis.technical.vwap.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fibonacci Retracement */}
          {analysis.technical.fibonacci && stockQuote && (
            <Card className="border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium">Fibonacci Retracement</CardTitle>
              </CardHeader>
              <CardContent>
                <FibonacciOverlay data={historicalData} currentPrice={stockQuote.price} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Performance Comparison Chart */}
      {analysis && (
        <ComparisonChart symbol={symbol} period="3mo" />
      )}

      <div className="space-y-2">
        <div>
          <h2 className="text-base font-medium">AI</h2>
          <p className="text-sm text-muted-foreground">On-demand.</p>
        </div>
        <AIAnalysisCard
          analysis={aiAnalysis || analysis?.ai || null}
          loading={aiLoading}
          onAnalyze={handleAiAnalyze}
        />
      </div>
    </div>
  );
}
