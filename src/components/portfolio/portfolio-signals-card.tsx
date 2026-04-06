'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOptionalNavigationPending } from '@/components/dashboard/navigation-pending-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCwIcon, RadioIcon, SparklesIcon } from 'lucide-react';
import type { LivePrice } from '@/hooks/use-live-prices';
import type {
  PortfolioHoldingSignals,
  PortfolioSignalAIHoldingRow,
  PortfolioSignalAIForecast,
  PortfolioSignalsAIResult,
  StockRecommendation,
} from '@/types';
import { cn } from '@/lib/utils';

interface PortfolioSignalsResponse {
  holdings: PortfolioHoldingSignals[];
  intraday: StockRecommendation[];
  swing: StockRecommendation[];
  long_term: StockRecommendation[];
  common: StockRecommendation[];
  generatedAt?: string;
  ai: PortfolioSignalsAIResult | null;
  aiError?: string;
}

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function actionBadgeClass(action: StockRecommendation['action']): string {
  switch (action) {
    case 'buy':
      return 'border-gain/40 bg-gain/10 text-gain';
    case 'sell':
    case 'exit':
      return 'border-loss/40 bg-loss/10 text-loss';
    default:
      return 'border-muted-foreground/30 bg-muted/50 text-muted-foreground';
  }
}

function SignalRow({
  rec,
  livePrice,
  onOpen,
  extraLabel,
  aiForecast,
}: {
  rec: StockRecommendation;
  livePrice?: LivePrice;
  onOpen: () => void;
  extraLabel?: string;
  aiForecast?: PortfolioSignalAIForecast | null;
}) {
  const px = livePrice?.price;
  const vsEntry =
    px !== undefined && Number.isFinite(rec.entry) && rec.entry > 0
      ? ((px - rec.entry) / rec.entry) * 100
      : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start justify-between gap-3 rounded-lg border p-2.5 sm:p-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-xs sm:text-sm">{rec.symbol}</span>
          {extraLabel && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{extraLabel}</span>
          )}
          <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', actionBadgeClass(rec.action))}>
            {rec.action.toUpperCase()}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{rec.timeframe}</span>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mt-1">{rec.reason}</p>
        {aiForecast && (
          <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-left">
            <div className="flex flex-wrap items-center gap-1.5">
              <SparklesIcon className="size-3 shrink-0 text-primary" />
              <span className="text-[10px] font-semibold text-primary">AI</span>
              <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', actionBadgeClass(aiForecast.action))}>
                {aiForecast.action.toUpperCase()}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{aiForecast.conviction}%</span>
            </div>
            <p className="text-[10px] sm:text-xs text-foreground/90 mt-1 leading-snug">{aiForecast.rationale}</p>
          </div>
        )}
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        {px !== undefined && (
          <p className="text-[10px] sm:text-xs font-medium tabular-nums">
            LTP {formatInr(px)}
            {vsEntry !== null && (
              <span className={cn('ml-1', vsEntry >= 0 ? 'text-gain' : 'text-loss')}>
                ({vsEntry >= 0 ? '+' : ''}
                {vsEntry.toFixed(2)}% vs entry)
              </span>
            )}
          </p>
        )}
        <p className="text-[10px] sm:text-xs tabular-nums text-muted-foreground">
          Entry ~ {rec.entry.toFixed(2)}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
          SL {rec.stop_loss.toFixed(2)} · TP {rec.target.toFixed(2)}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground">Conviction {rec.conviction}%</p>
      </div>
    </button>
  );
}

interface PortfolioSignalsCardProps {
  symbols: string[];
  getPrice: (symbol: string) => LivePrice | undefined;
}

export function PortfolioSignalsCard({ symbols, getPrice }: PortfolioSignalsCardProps) {
  const router = useRouter();
  const navPending = useOptionalNavigationPending();
  const [data, setData] = useState<PortfolioSignalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recTab, setRecTab] = useState<
    'common' | 'short_term' | 'intraday' | 'swing' | 'long_term'
  >('common');

  const fetchSignals = useCallback(async () => {
    if (symbols.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio/signals?ai=1');
      if (!res.ok) return;
      const json = await res.json();
      setData({
        holdings: json.holdings || [],
        intraday: json.intraday || [],
        swing: json.swing || [],
        long_term: json.long_term || [],
        common: json.common || [],
        generatedAt: json.generatedAt,
        ai: json.ai ?? null,
        aiError: json.aiError,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [symbols.length]);

  useEffect(() => {
    if (symbols.length === 0) {
      setData(null);
      return;
    }
    fetchSignals();
  }, [fetchSignals, symbols.length]);

  useEffect(() => {
    if (symbols.length === 0) return;
    function getRefreshInterval() {
      const now = new Date();
      const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const day = ist.getDay();
      const mins = ist.getHours() * 60 + ist.getMinutes();
      if (day === 0 || day === 6) return 30 * 60 * 1000;
      if (mins >= 555 && mins <= 930) return 5 * 60 * 1000;
      return 30 * 60 * 1000;
    }
    const id = setInterval(() => fetchSignals(), getRefreshInterval());
    return () => clearInterval(id);
  }, [fetchSignals, symbols.length]);

  const openStock = (sym: string) => {
    const href = `/stocks/${sym}`;
    if (navPending) navPending.navigate(href);
    else router.push(href);
  };

  if (symbols.length === 0) return null;

  const listForTab = (): StockRecommendation[] => {
    if (!data) return [];
    switch (recTab) {
      case 'common':
        return data.common;
      case 'intraday':
        return data.intraday;
      case 'swing':
        return data.swing;
      case 'long_term':
        return data.long_term;
      default:
        return [];
    }
  };

  const rows = listForTab();
  const holdings = data?.holdings ?? [];

  const aiBySymbol = useMemo(() => {
    const m = new Map<string, PortfolioSignalAIHoldingRow>();
    const list = data?.ai?.holdings;
    if (!list) return m;
    for (const row of list) {
      m.set(row.symbol.toUpperCase(), row);
    }
    return m;
  }, [data?.ai?.holdings]);

  const aiFor = (symbol: string, horizon: 'intraday' | 'swing' | 'long_term' | 'common') => {
    const row = aiBySymbol.get(symbol.toUpperCase());
    if (!row) return null;
    return row[horizon];
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-2 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm sm:text-lg">Portfolio signals</CardTitle>
              <span className="inline-flex items-center gap-1 rounded-md border border-gain/30 bg-gain/5 px-1.5 py-0.5 text-[10px] text-gain">
                <RadioIcon className="size-3" />
                Live LTP
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 max-w-xl">
              Rule-based levels plus an AI synthesis (same router as stock analysis). Short term = intraday +
              swing; long term = positional. LTP is live; AI refreshes on a short cache.
            </p>
            {data?.ai?.portfolio_note && (
              <p className="text-[10px] sm:text-xs text-foreground/90 mt-2 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-2 leading-relaxed">
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <SparklesIcon className="size-3.5" />
                  AI overview
                  {data.ai.model && (
                    <span className="font-normal text-muted-foreground">· {data.ai.model}</span>
                  )}
                </span>
                <span className="block mt-1 text-muted-foreground">{data.ai.portfolio_note}</span>
              </p>
            )}
            {data?.aiError && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                AI layer unavailable: {data.aiError}
              </p>
            )}
            {data?.generatedAt && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                Signals updated {new Date(data.generatedAt).toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={() => fetchSignals()}
            disabled={loading}
          >
            <RefreshCwIcon className={cn('size-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline ml-1">Refresh</span>
          </Button>
        </div>

        <Tabs value={recTab} onValueChange={(v) => setRecTab(v as typeof recTab)}>
          <TabsList className="h-auto min-h-8 flex-wrap gap-0.5" variant="default">
            <TabsTrigger value="common" className="text-[10px] sm:text-xs px-2 h-7">
              Common
            </TabsTrigger>
            <TabsTrigger value="short_term" className="text-[10px] sm:text-xs px-2 h-7">
              Short term
            </TabsTrigger>
            <TabsTrigger value="intraday" className="text-[10px] sm:text-xs px-2 h-7">
              Intraday
            </TabsTrigger>
            <TabsTrigger value="swing" className="text-[10px] sm:text-xs px-2 h-7">
              Swing
            </TabsTrigger>
            <TabsTrigger value="long_term" className="text-[10px] sm:text-xs px-2 h-7">
              Long term
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
        {loading && !data && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {data && recTab !== 'short_term' && (
          <div className="space-y-1.5 sm:space-y-2">
            {rows.map((rec) => {
              const hz =
                recTab === 'common'
                  ? 'common'
                  : recTab === 'intraday'
                    ? 'intraday'
                    : recTab === 'swing'
                      ? 'swing'
                      : 'long_term';
              return (
                <SignalRow
                  key={`${rec.symbol}-${rec.timeframe}-${rec.generated_at}`}
                  rec={rec}
                  livePrice={getPrice(rec.symbol)}
                  onOpen={() => openStock(rec.symbol)}
                  aiForecast={aiFor(rec.symbol, hz)}
                />
              );
            })}
            {recTab === 'common' && rows.length === 0 && (
              <p className="text-xs text-muted-foreground">No common trend view for your holdings yet.</p>
            )}
            {recTab === 'intraday' && rows.length === 0 && (
              <p className="text-xs text-muted-foreground">No intraday setups for your holdings right now.</p>
            )}
            {recTab === 'swing' && rows.length === 0 && (
              <p className="text-xs text-muted-foreground">No swing setups for your holdings right now.</p>
            )}
            {recTab === 'long_term' && rows.length === 0 && (
              <p className="text-xs text-muted-foreground">No long-term positional signals right now.</p>
            )}
          </div>
        )}

        {data && recTab === 'short_term' && (
          <div className="space-y-3">
            {holdings.map((h) => {
              const hasAny = h.intraday || h.swing;
              return (
                <div key={h.symbol} className="rounded-lg border bg-muted/20 p-2 sm:p-3 space-y-2">
                  <p className="text-xs sm:text-sm font-semibold">
                    {h.symbol}
                    <span className="font-normal text-muted-foreground ml-2 truncate">{h.name}</span>
                  </p>
                  {!hasAny && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground">No short-term signals for this symbol.</p>
                  )}
                  {h.intraday && (
                    <SignalRow
                      rec={h.intraday}
                      livePrice={getPrice(h.symbol)}
                      onOpen={() => openStock(h.symbol)}
                      extraLabel="Intraday"
                      aiForecast={aiFor(h.symbol, 'intraday')}
                    />
                  )}
                  {h.swing && (
                    <SignalRow
                      rec={h.swing}
                      livePrice={getPrice(h.symbol)}
                      onOpen={() => openStock(h.symbol)}
                      extraLabel="Swing"
                      aiForecast={aiFor(h.symbol, 'swing')}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
