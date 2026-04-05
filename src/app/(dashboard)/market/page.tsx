'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOptionalNavigationPending } from '@/components/dashboard/navigation-pending-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3Icon,
  GemIcon,
  RefreshCwIcon,
  ActivityIcon,
  LandmarkIcon,
  MonitorIcon,
  ZapIcon,
  CarIcon,
  HeartPulseIcon,
  ShoppingCartIcon,
  WalletIcon,
  HardHatIcon,
  RadioIcon,
  ShoppingBagIcon,
  LayoutGridIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowUpDownIcon,
  SearchIcon,
  FilterIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarketPulse from '@/components/market/market-pulse';
import { SectorHeatmap } from '@/components/market/sector-heatmap';
import { useLivePrices, type LivePrice } from '@/hooks/use-live-prices';
import type { StockRecommendation } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MarketItem {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  volume?: number;
  unit?: string;
}

interface MarketData {
  indices: MarketItem[];
  goldSilver: MarketItem[];
  topGainers: MarketItem[];
  topLosers: MarketItem[];
  allStocks: MarketItem[];
  sectors?: Record<string, MarketItem[]>;
  usdInrRate?: number;
  updatedAt: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatVolume(vol: number): string {
  if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
  if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
  return vol.toString();
}

function PriceCard({ item, onClick, livePrice }: { item: MarketItem; onClick?: () => void; livePrice?: LivePrice }) {
  const price = livePrice?.price ?? item.price;
  const change = livePrice?.change ?? item.change;
  const changePercent = livePrice?.changePercent ?? item.changePercent;
  const isPositive = change >= 0;
  const flashClass = livePrice?.direction === 'up'
    ? 'animate-flash-green'
    : livePrice?.direction === 'down'
    ? 'animate-flash-red'
    : '';

  return (
    <Card
      className={`transition-all hover:shadow-md active:scale-[0.98] cursor-pointer ${flashClass}`}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-base font-semibold truncate">{item.name}</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <p className="text-lg sm:text-2xl font-bold tabular-nums">
                {formatNumber(price)}
              </p>
              {item.unit && (
                <span className="text-[10px] sm:text-xs text-muted-foreground">{item.unit}</span>
              )}
            </div>
          </div>
          <div
            className={`text-right shrink-0 ${
              isPositive
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            <div className="flex items-center gap-0.5 justify-end">
              {isPositive ? (
                <TrendingUpIcon className="size-3.5 sm:size-4" />
              ) : (
                <TrendingDownIcon className="size-3.5 sm:size-4" />
              )}
              <span className="text-xs sm:text-base font-semibold tabular-nums">
                {isPositive ? '+' : ''}
                {changePercent.toFixed(2)}%
              </span>
            </div>
            <p className="text-[10px] sm:text-sm tabular-nums mt-0.5">
              {isPositive ? '+' : ''}
              {change.toFixed(2)}
            </p>
          </div>
        </div>
        {(livePrice?.volume ?? item.volume) !== undefined && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5">
            Vol: {formatVolume(livePrice?.volume ?? item.volume!)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StockRow({
  item,
  onClick,
  rank,
  livePrice,
}: {
  item: MarketItem;
  onClick?: () => void;
  rank: number;
  livePrice?: LivePrice;
}) {
  const price = livePrice?.price ?? item.price;
  const changePercent = livePrice?.changePercent ?? item.changePercent;
  const isPositive = (livePrice?.change ?? item.change) >= 0;
  const flashClass = livePrice?.direction === 'up'
    ? 'animate-flash-green'
    : livePrice?.direction === 'down'
    ? 'animate-flash-red'
    : '';

  return (
    <button
      className={`flex w-full items-center justify-between px-2 sm:px-4 py-2.5 sm:py-3.5 text-left hover:bg-muted/50 active:bg-muted/70 transition-colors rounded-lg ${flashClass}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-[10px] sm:text-sm text-muted-foreground w-4 sm:w-6 shrink-0">{rank}</span>
        <div className="min-w-0">
          <p className="font-medium text-xs sm:text-base">{item.symbol}</p>
          <p className="text-[10px] sm:text-sm text-muted-foreground truncate max-w-[100px] sm:max-w-[200px]">
            {item.name}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-medium text-xs sm:text-base tabular-nums">
          {formatNumber(price)}
        </p>
        <p
          className={`text-[10px] sm:text-sm font-medium tabular-nums ${
            isPositive
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {isPositive ? '+' : ''}
          {changePercent.toFixed(2)}%
        </p>
      </div>
    </button>
  );
}

function StockCard({
  item,
  onClick,
  livePrice,
}: {
  item: MarketItem;
  onClick?: () => void;
  livePrice?: LivePrice;
}) {
  const price = livePrice?.price ?? item.price;
  const change = livePrice?.change ?? item.change;
  const changePercent = livePrice?.changePercent ?? item.changePercent;
  const isPositive = change >= 0;
  const flashClass = livePrice?.direction === 'up'
    ? 'animate-flash-green'
    : livePrice?.direction === 'down'
    ? 'animate-flash-red'
    : '';
  const displaySymbol = item.symbol.replace('.NS', '').replace('.BO', '');

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        flashClass,
        'group w-full text-left rounded-xl border border-border/70 bg-card',
        'shadow-none transition-[box-shadow,background-color,border-color] duration-200',
        'hover:border-primary/25 hover:bg-muted/30 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isPositive
          ? 'border-l-[3px] border-l-emerald-600'
          : 'border-l-[3px] border-l-red-500'
      )}
    >
      <div className="px-3 py-3 sm:px-3.5 sm:py-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {displaySymbol}
          </span>
          <span
            className={cn(
              'shrink-0 font-mono text-[11px] font-semibold tabular-nums',
              isPositive
                ? 'text-emerald-700'
                : 'text-red-600'
            )}
          >
            {isPositive ? '+' : ''}
            {changePercent.toFixed(2)}%
          </span>
        </div>

        <p className="mt-2 font-mono text-base sm:text-lg font-semibold tabular-nums tracking-tight text-foreground">
          {formatNumber(price)}
        </p>
        <p className="mt-0.5 font-mono text-[10px] sm:text-[11px] tabular-nums text-muted-foreground">
          {formatNumber(change)}{' '}
          <span className="font-sans text-muted-foreground/75">vs prev. close</span>
        </p>

        <p className="mt-2.5 border-t border-border/50 pt-2.5 text-[11px] sm:text-xs leading-snug text-muted-foreground line-clamp-2">
          {item.name}
        </p>
      </div>
    </button>
  );
}

const SECTOR_ICONS: Record<string, React.ElementType> = {
  'All': LayoutGridIcon,
  'Banking & Finance': LandmarkIcon,
  'IT & Technology': MonitorIcon,
  'Energy & Power': ZapIcon,
  'Metals & Mining': HardHatIcon,
  'Consumer': ShoppingBagIcon,
  'FMCG': ShoppingCartIcon,
  'Pharma & Healthcare': HeartPulseIcon,
  'Infra & Industrial': CarIcon,
  'Telecom & Media': RadioIcon,
  'Real Estate': WalletIcon,
  'Utilities': ZapIcon,
};

export default function MarketPage() {
  const router = useRouter();
  const navPending = useOptionalNavigationPending();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [recUniverse, setRecUniverse] = useState<'nifty50' | 'nifty100'>('nifty50');
  const [intradayRisk, setIntradayRisk] = useState<'atr' | 'fixed'>('atr');
  const [swingRisk, setSwingRisk] = useState<'atr' | 'fixed'>('atr');
  const [longRisk, setLongRisk] = useState<'atr' | 'fixed'>('atr');
  const [marketRecs, setMarketRecs] = useState<{
    common: StockRecommendation[];
    intraday: StockRecommendation[];
    swing: StockRecommendation[];
    long_term: StockRecommendation[];
    generatedAt?: string;
  } | null>(null);
  const [recTab, setRecTab] = useState<'common' | 'intraday' | 'swing' | 'long_term'>('common');
  const [activeSector, setActiveSector] = useState('All');
  const [stockSearch, setStockSearch] = useState('');
  const [stockSort, setStockSort] = useState<'change' | 'price' | 'name' | 'volume'>('change');
  const [stockFilter, setStockFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const sectorScrollRef = useRef<HTMLDivElement>(null);

  // Live price streaming
  const { getPrice, connected: liveConnected, lastUpdate: liveLastUpdate, marketStatus } = useLivePrices({ enabled: autoRefresh });

  const fetchMarketData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/market/overview');
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMarketRecommendations = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: '10',
        universe: recUniverse,
        intradayRisk,
        swingRisk,
        longRisk,
      });
      const res = await fetch(`/api/recommendations/market?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setMarketRecs({
        common: json.common || [],
        intraday: json.intraday || [],
        swing: json.swing || [],
        long_term: json.long_term || [],
        generatedAt: json.generatedAt,
      });
    } catch {
      // ignore
    }
  }, [recUniverse, intradayRisk, swingRisk, longRisk]);

  useEffect(() => {
    fetchMarketData();
    fetchMarketRecommendations();
  }, [fetchMarketData, fetchMarketRecommendations]);

  useEffect(() => {
    if (!autoRefresh) return;
    // Smart refresh: 5 min during market hours, 30 min otherwise (server caches accordingly)
    function getRefreshInterval() {
      const now = new Date();
      const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const day = ist.getDay();
      const mins = ist.getHours() * 60 + ist.getMinutes();
      if (day === 0 || day === 6) return 30 * 60 * 1000; // weekend
      if (mins >= 555 && mins <= 930) return 5 * 60 * 1000; // market hours 9:15-15:30
      return 30 * 60 * 1000; // after hours
    }
    const interval = setInterval(() => fetchMarketData(true), getRefreshInterval());
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMarketData]);

  const handleStockClick = (symbol: string) => {
    const cleanSymbol = symbol
      .replace('.NS', '')
      .replace('.BO', '')
      .replace('^', '')
      .replace('=F', '');
    const href = `/stocks/${cleanSymbol}`;
    if (navPending) {
      navPending.navigate(href);
    } else {
      router.push(href);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 sm:h-9 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-28 mt-2" />
                <Skeleton className="h-3 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-3xl font-bold">Market Overview</h1>
          {autoRefresh && (
            marketStatus.isOpen ? (
              <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full ${
                liveConnected
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-yellow-500/10 text-yellow-600'
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
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                <span className="size-1.5 rounded-full bg-orange-500" />
                <span className="hidden sm:inline">{marketStatus.message || 'Market Closed'}</span>
                <span className="sm:hidden">Closed</span>
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {liveLastUpdate && (
            <span className="text-[10px] sm:text-sm text-muted-foreground hidden sm:inline">
              {liveLastUpdate.toLocaleTimeString('en-IN')}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-7 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm ${autoRefresh ? 'text-green-600' : ''}`}
          >
            <ActivityIcon className="size-3.5 sm:size-4 mr-1" />
            <span className="hidden sm:inline">{autoRefresh ? 'Live' : 'Paused'}</span>
            {autoRefresh && (
              <span className="sm:hidden size-1.5 rounded-full bg-green-500 ml-1 animate-pulse" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMarketData(true)}
            disabled={refreshing}
            className="h-7 sm:h-9 px-2 sm:px-3"
          >
            <RefreshCwIcon className={`size-3.5 sm:size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Recommendations */}
      {marketRecs && (
        <Card id="market-recommendations" className="scroll-mt-20">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-lg">Recommendations</CardTitle>
                {marketRecs.generatedAt && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    Updated {new Date(marketRecs.generatedAt).toLocaleTimeString('en-IN')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={recUniverse}
                  onChange={(e) => setRecUniverse(e.target.value as any)}
                  className="h-8 rounded-lg border bg-background px-2 text-[10px] sm:text-xs"
                >
                  <option value="nifty50">NIFTY 50</option>
                  <option value="nifty100">NIFTY 100</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-[10px] sm:text-xs"
                  onClick={() => fetchMarketRecommendations()}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center justify-between rounded-lg border px-2 py-1.5">
                <span className="text-[10px] sm:text-xs text-muted-foreground">Intraday risk</span>
                <select
                  value={intradayRisk}
                  onChange={(e) => setIntradayRisk(e.target.value as any)}
                  className="h-7 rounded-md border bg-background px-2 text-[10px] sm:text-xs"
                >
                  <option value="atr">ATR</option>
                  <option value="fixed">Fixed %</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-2 py-1.5">
                <span className="text-[10px] sm:text-xs text-muted-foreground">Swing risk</span>
                <select
                  value={swingRisk}
                  onChange={(e) => setSwingRisk(e.target.value as any)}
                  className="h-7 rounded-md border bg-background px-2 text-[10px] sm:text-xs"
                >
                  <option value="atr">ATR</option>
                  <option value="fixed">Fixed %</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-2 py-1.5">
                <span className="text-[10px] sm:text-xs text-muted-foreground">Long-term risk</span>
                <select
                  value={longRisk}
                  onChange={(e) => setLongRisk(e.target.value as any)}
                  className="h-7 rounded-md border bg-background px-2 text-[10px] sm:text-xs"
                >
                  <option value="atr">ATR</option>
                  <option value="fixed">Fixed %</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
            <div className="mb-2">
              <Tabs value={recTab} onValueChange={(v) => setRecTab(v as any)}>
                <TabsList className="h-8" variant="default">
                  <TabsTrigger value="common" className="text-xs px-2 h-7">
                    Common
                  </TabsTrigger>
                  <TabsTrigger value="intraday" className="text-xs px-2 h-7">
                    Intraday
                  </TabsTrigger>
                  <TabsTrigger value="swing" className="text-xs px-2 h-7">
                    Swing
                  </TabsTrigger>
                  <TabsTrigger value="long_term" className="text-xs px-2 h-7">
                    Long-term
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              {(recTab === 'common'
                ? marketRecs.common
                : recTab === 'intraday'
                ? marketRecs.intraday
                : recTab === 'swing'
                ? marketRecs.swing
                : marketRecs.long_term
              ).slice(0, 10).map((rec) => (
                <button
                  key={`${rec.symbol}-${rec.generated_at}-${rec.timeframe}`}
                  onClick={() => handleStockClick(rec.symbol)}
                  className="flex w-full items-start justify-between rounded-lg border p-2.5 sm:p-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm">
                      {rec.symbol}{' '}
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        · {rec.action.toUpperCase()} · {rec.timeframe}
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
                </button>
              ))}
              {recTab === 'common' && marketRecs.common.length === 0 && (
                <p className="text-xs text-muted-foreground">No common picks right now.</p>
              )}
              {recTab === 'intraday' && marketRecs.intraday.length === 0 && (
                <p className="text-xs text-muted-foreground">No intraday setups right now.</p>
              )}
              {recTab === 'swing' && marketRecs.swing.length === 0 && (
                <p className="text-xs text-muted-foreground">No swing setups right now.</p>
              )}
              {recTab === 'long_term' && marketRecs.long_term.length === 0 && (
                <p className="text-xs text-muted-foreground">No long-term setups right now.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Pulse + Indices */}
      {data && data.indices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:gap-6 items-start">
          {/* Market Sentiment Gauge */}
          <Card className="sm:w-[250px]">
            <CardContent className="p-4 sm:p-5">
              <MarketPulse
                indices={data.indices}
                topGainers={data.topGainers}
                topLosers={data.topLosers}
                allStocks={data.allStocks}
              />
            </CardContent>
          </Card>

          {/* Indices Grid */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3Icon className="size-4 sm:size-5 text-blue-500" />
              <h2 className="text-sm sm:text-lg font-semibold">Indices</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {data.indices.map((item) => (
                <PriceCard key={item.symbol} item={item} livePrice={getPrice(item.symbol.replace('^', '').replace('.NS', ''))} />
              ))}
            </div>
          </section>
        </div>
      )}

      {data && data.indices.length === 0 && null}

      {/* Gold, Silver & Crude */}
      {data && data.goldSilver && data.goldSilver.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <GemIcon className="size-4 sm:size-5 text-yellow-500" />
            <h2 className="text-sm sm:text-lg font-semibold">Gold, Silver & Crude</h2>
            {data.usdInrRate && (
              <span className="text-[10px] sm:text-sm text-muted-foreground ml-auto">
                USD/INR: {data.usdInrRate.toFixed(2)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {data.goldSilver.map((item) => (
              <PriceCard key={item.symbol} item={item} livePrice={getPrice(item.symbol)} />
            ))}
          </div>
        </section>
      )}

      {/* Top Gainers & Losers */}
      {data && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-1 px-3 sm:px-6 pt-3 sm:pt-5">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                <TrendingUpIcon className="size-4 sm:size-5 text-green-500" />
                Top Gainers
                <Badge className="bg-green-500/10 text-green-600 ml-auto text-[10px] sm:text-xs">
                  NSE
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-4 pb-2">
              {data.topGainers.length > 0 ? (
                <div className="divide-y">
                  {data.topGainers.map((item, i) => (
                    <StockRow
                      key={item.symbol}
                      item={item}
                      rank={i + 1}
                      onClick={() => handleStockClick(item.symbol)}
                      livePrice={getPrice(item.symbol)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                  No gainers today
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 px-3 sm:px-6 pt-3 sm:pt-5">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                <TrendingDownIcon className="size-4 sm:size-5 text-red-500" />
                Top Losers
                <Badge className="bg-red-500/10 text-red-600 ml-auto text-[10px] sm:text-xs">
                  NSE
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-4 pb-2">
              {data.topLosers.length > 0 ? (
                <div className="divide-y">
                  {data.topLosers.map((item, i) => (
                    <StockRow
                      key={item.symbol}
                      item={item}
                      rank={i + 1}
                      onClick={() => handleStockClick(item.symbol)}
                      livePrice={getPrice(item.symbol)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                  No losers today
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sector Heatmap */}
      {data?.sectors && Object.keys(data.sectors).length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3Icon className="size-4 sm:size-5 text-primary" />
            <h2 className="text-sm sm:text-lg font-semibold">Sector Performance</h2>
          </div>
          <SectorHeatmap
            sectors={Object.fromEntries(
              Object.entries(data.sectors).map(([name, stocks]) => [
                name,
                stocks.map((s) => ({ changePercent: s.changePercent })),
              ])
            )}
          />
        </section>
      )}

      {/* Stocks by Sector */}
      {data && data.allStocks.length > 0 && (() => {
        const sectorNames = data.sectors ? ['All', ...Object.keys(data.sectors)] : ['All'];

        // Base stocks from sector selection
        let sectorStocks = activeSector === 'All'
          ? data.allStocks
          : (data.sectors?.[activeSector] || []);

        // Apply search filter
        if (stockSearch.trim()) {
          const q = stockSearch.toLowerCase();
          sectorStocks = sectorStocks.filter(s =>
            s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
          );
        }

        // Apply gainers/losers filter
        if (stockFilter === 'gainers') {
          sectorStocks = sectorStocks.filter(s => s.changePercent > 0);
        } else if (stockFilter === 'losers') {
          sectorStocks = sectorStocks.filter(s => s.changePercent < 0);
        }

        // Apply sort
        const sortedStocks = [...sectorStocks].sort((a, b) => {
          switch (stockSort) {
            case 'change': return Math.abs(b.changePercent) - Math.abs(a.changePercent);
            case 'price': return b.price - a.price;
            case 'name': return a.name.localeCompare(b.name);
            case 'volume': return (b.volume ?? 0) - (a.volume ?? 0);
            default: return 0;
          }
        });

        const visibleStocks = sortedStocks.slice(0, visibleCount);
        const hasMore = sortedStocks.length > visibleCount;

        const scrollSectors = (dir: 'left' | 'right') => {
          sectorScrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
        };

        return (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3Icon className="size-4 sm:size-5 text-primary" />
              <h2 className="text-sm sm:text-lg font-semibold">Stocks by Sector</h2>
              <Badge className="bg-primary/10 text-primary ml-auto text-[10px] sm:text-xs">
                {sortedStocks.length} stocks
              </Badge>
            </div>

            {/* Sector tabs with scroll */}
            <div className="relative mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 size-7 bg-card/90 shadow-sm border hidden sm:flex"
                onClick={() => scrollSectors('left')}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <div
                ref={sectorScrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-0 sm:px-8 pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {sectorNames.map((sector) => {
                  const Icon = SECTOR_ICONS[sector] || BarChart3Icon;
                  const isActive = activeSector === sector;
                  const count = sector === 'All'
                    ? data.allStocks.length
                    : (data.sectors?.[sector]?.length || 0);
                  return (
                    <button
                      key={sector}
                      onClick={() => { setActiveSector(sector); setVisibleCount(12); }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card border hover:bg-muted hover:shadow-sm'
                      }`}
                    >
                      <Icon className="size-3.5 sm:size-4" />
                      {sector}
                      <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 size-7 bg-card/90 shadow-sm border hidden sm:flex"
                onClick={() => scrollSectors('right')}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[140px] max-w-xs">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search stocks..."
                  value={stockSearch}
                  onChange={(e) => { setStockSearch(e.target.value); setVisibleCount(12); }}
                  className="w-full h-8 pl-8 pr-3 text-xs sm:text-sm bg-muted/30 border border-muted-foreground/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 focus:bg-background transition-colors"
                />
              </div>

              {/* Gainers / Losers / All filter */}
              <div className="flex rounded-lg border border-muted-foreground/10 overflow-hidden">
                {(['all', 'gainers', 'losers'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setStockFilter(f); setVisibleCount(12); }}
                    className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${
                      stockFilter === f
                        ? f === 'gainers' ? 'bg-green-500/15 text-green-600'
                        : f === 'losers' ? 'bg-red-500/15 text-red-600'
                        : 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <FilterIcon className="size-3 inline mr-1 sm:hidden" />
                    {f === 'all' ? 'All' : f === 'gainers' ? 'Gainers' : 'Losers'}
                  </button>
                ))}
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={stockSort}
                  onChange={(e) => setStockSort(e.target.value as typeof stockSort)}
                  className="appearance-none h-8 pl-2.5 pr-7 text-[10px] sm:text-xs font-medium bg-muted/30 border border-muted-foreground/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                >
                  <option value="change">Sort: Most Active</option>
                  <option value="price">Sort: Price</option>
                  <option value="volume">Sort: Volume</option>
                  <option value="name">Sort: A-Z</option>
                </select>
                <ArrowUpDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/50 pointer-events-none" />
              </div>
            </div>

            {/* Stock cards grid — limited to visibleCount */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {visibleStocks.map((item) => (
                <StockCard
                  key={item.symbol}
                  item={item}
                  onClick={() => handleStockClick(item.symbol)}
                  livePrice={getPrice(item.symbol)}
                />
              ))}
            </div>

            {/* Show more / less */}
            {sortedStocks.length > 12 && (
              <div className="flex justify-center mt-4">
                {hasMore ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs sm:text-sm gap-1.5"
                    onClick={() => setVisibleCount(prev => prev + 12)}
                  >
                    <ChevronDownIcon className="size-4" />
                    Show More ({sortedStocks.length - visibleCount} remaining)
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs sm:text-sm text-muted-foreground"
                    onClick={() => setVisibleCount(12)}
                  >
                    Show Less
                  </Button>
                )}
              </div>
            )}

            {sortedStocks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No stocks found {stockSearch ? `matching "${stockSearch}"` : 'in this sector'}
              </p>
            )}
          </section>
        );
      })()}
    </div>
  );
}
