'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  Loader2Icon,
  RotateCcwIcon,
  SearchIcon,
  TrophyIcon,
  WalletIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLivePrices } from '@/hooks/use-live-prices';
import { PRACTICE_MAX_QUANTITY } from '@/lib/practice/positions';
import { cn } from '@/lib/utils';

type Exchange = 'NSE' | 'BSE';

interface PracticePositionRow {
  symbol: string;
  exchange: Exchange;
  name: string;
  quantity: number;
  avgPrice: number;
  invested: number;
  ltp: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  dayChangePercent: number;
}

interface PracticeTradeRow {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  created_at: string;
}

interface PracticePayload {
  account: {
    startingCash: number;
    cash: number;
    holdingsValue: number;
    totalValue: number;
    totalPnl: number;
    totalPnlPercent: number;
    realizedPnl: number;
  };
  positions: PracticePositionRow[];
  trades: PracticeTradeRow[];
  marketOpen: boolean;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: Exchange;
}

/** Large, well-known NIFTY 50 names so first-timers have somewhere to start. */
const STARTER_PICKS: SearchResult[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE' },
  { symbol: 'INFY', name: 'Infosys', exchange: 'NSE' },
  { symbol: 'ITC', name: 'ITC', exchange: 'NSE' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
];

const STEPS = [
  { title: 'Pick a company', body: 'Search any NSE stock or start with a well-known name below.' },
  { title: 'Buy a few shares', body: 'Orders fill instantly at the live market price using virtual cash.' },
  { title: 'Watch & learn', body: 'Track your profit or loss, sell when you like, and reset anytime.' },
];

const GLOSSARY = [
  { term: 'Share price (LTP)', def: 'Last traded price — what one share costs right now.' },
  { term: 'Average price', def: 'What you paid per share on average across all your buys.' },
  { term: 'P&L', def: 'Profit & loss: current value minus what you invested.' },
  { term: 'Realised P&L', def: 'Profit or loss you locked in by selling.' },
  { term: 'Market order', def: 'Buy or sell immediately at the current price.' },
  { term: 'Diversification', def: 'Spreading money over several companies so one bad stock hurts less.' },
];

function formatInr(n: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

function signed(n: number, fmt: (v: number) => string): string {
  return `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
}

function trendOf(n: number): 'up' | 'down' | 'neutral' {
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'neutral';
}

export function PracticeTrading() {
  const [data, setData] = useState<PracticePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [placing, setPlacing] = useState<'buy' | 'sell' | null>(null);
  const [resetting, setResetting] = useState(false);
  const orderRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/practice');
      if (!res.ok) throw new Error('load failed');
      setData(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced stock search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/stocks?q=${encodeURIComponent(q)}`);
        const json = res.ok ? await res.json() : { results: [] };
        if (!cancelled) setResults((json.results ?? []).slice(0, 6));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const selectedSymbols = useMemo(() => (selected ? [selected.symbol] : []), [selected]);
  const { prices } = useLivePrices({ symbols: selectedSymbols, enabled: !!selected });
  const livePrice = selected ? prices.get(selected.symbol)?.price ?? null : null;

  const qty = Math.floor(Number(quantity));
  const qtyValid = Number.isFinite(qty) && qty > 0 && qty <= PRACTICE_MAX_QUANTITY;
  const estCost = livePrice && qtyValid ? livePrice * qty : null;
  const held = selected
    ? data?.positions.find((p) => p.symbol === selected.symbol)?.quantity ?? 0
    : 0;
  const maxAffordable =
    livePrice && data ? Math.floor(data.account.cash / livePrice) : null;

  const choose = (stock: SearchResult, presetQty?: number) => {
    setSelected(stock);
    setQuery('');
    setResults([]);
    if (presetQty) setQuantity(String(presetQty));
    orderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const placeOrder = async (side: 'buy' | 'sell') => {
    if (!selected || !qtyValid) return;
    setPlacing(side);
    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selected.symbol,
          exchange: selected.exchange,
          side,
          quantity: qty,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Order failed');
        return;
      }
      toast.success(
        `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${selected.symbol} at ${formatInr(json.price, 2)}`,
        json.marketOpen === false
          ? { description: 'Market is closed, so this filled at the last traded price.' }
          : undefined
      );
      await load();
    } catch {
      toast.error('Order failed. Check your connection and try again.');
    } finally {
      setPlacing(null);
    }
  };

  const reset = async () => {
    if (!window.confirm('Start over? This clears all practice trades and restores your virtual cash.')) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/practice/reset', { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Practice account reset');
      setSelected(null);
      await load();
    } catch {
      toast.error('Could not reset. Try again.');
    } finally {
      setResetting(false);
    }
  };

  const acct = data?.account;
  const isNew = !!data && data.trades.length === 0;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start gap-3">
            <GraduationCapIcon className="size-6 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-semibold sm:text-lg">
                Learn investing with {formatInr(acct?.startingCash ?? 100_000)} of virtual money
              </h2>
              <p className="text-sm text-muted-foreground">
                Buy and sell real NSE stocks at live prices — no real money, no risk. A safe way to see how
                the market moves before you invest for real.
              </p>
            </div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-lg border bg-card px-3 py-2.5">
                <p className="text-xs font-semibold">
                  <span className="text-primary">{i + 1}.</span> {s.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.body}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-xl" />
          ))}
        </div>
      ) : loadError || !acct ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground flex items-center justify-between gap-3">
            Could not load your practice account.
            <Button size="sm" variant="outline" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={TrophyIcon} title="Total value" value={formatInr(acct.totalValue)} />
          <StatCard icon={WalletIcon} title="Cash left" value={formatInr(acct.cash)} />
          <StatCard icon={BriefcaseIcon} title="In stocks" value={formatInr(acct.holdingsValue)} />
          <StatCard
            title="Overall profit / loss"
            value={signed(acct.totalPnl, (v) => formatInr(v))}
            subtitle={`${signed(acct.totalPnlPercent, (v) => v.toFixed(2))}% · realised ${signed(
              acct.realizedPnl,
              (v) => formatInr(v)
            )}`}
            trend={trendOf(acct.totalPnl)}
          />
        </div>
      )}

      <div ref={orderRef} className="scroll-mt-24">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Place a practice order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="practice-search">Find a stock</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="practice-search"
                  placeholder="Search by name or symbol, e.g. Tata, INFY"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  autoComplete="off"
                />
                {searching && (
                  <Loader2Icon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {results.length > 0 && (
                <ul className="rounded-lg border divide-y">
                  {results.map((r) => (
                    <li key={`${r.symbol}-${r.exchange}`}>
                      <button
                        type="button"
                        onClick={() => choose(r)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60"
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{r.symbol}</span>{' '}
                          <span className="text-muted-foreground truncate">{r.name}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">{r.exchange}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!selected && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs text-muted-foreground self-center">Popular:</span>
                  {STARTER_PICKS.map((s) => (
                    <Button
                      key={s.symbol}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => choose(s)}
                    >
                      {s.symbol}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {selected && (
              <div className="rounded-lg border px-3 py-3 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <Link
                      href={`/stocks/${selected.symbol}`}
                      className="font-semibold hover:underline underline-offset-4"
                    >
                      {selected.symbol}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-2">{selected.name}</span>
                  </div>
                  <span className="text-sm tabular-nums">
                    {livePrice ? formatInr(livePrice, 2) : <Skeleton className="inline-block h-4 w-16 align-middle" />}
                    <span className="text-xs text-muted-foreground"> / share</span>
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="practice-qty">Number of shares</Label>
                    <Input
                      id="practice-qty"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={PRACTICE_MAX_QUANTITY}
                      step={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      Estimated amount:{' '}
                      <span className="font-medium text-foreground tabular-nums">
                        {estCost !== null ? formatInr(estCost, 2) : '—'}
                      </span>
                    </p>
                    <p>
                      {maxAffordable !== null && <>You can afford up to {maxAffordable} share(s). </>}
                      {held > 0 && <>You hold {held}.</>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => placeOrder('buy')}
                    disabled={!qtyValid || placing !== null || !data}
                    className="bg-gain text-white hover:bg-gain/90"
                  >
                    {placing === 'buy' ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <ArrowUpRightIcon className="size-4" />
                    )}
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => placeOrder('sell')}
                    disabled={!qtyValid || placing !== null || held === 0}
                    className="border-loss/40 text-loss hover:bg-loss/10"
                  >
                    {placing === 'sell' ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <ArrowDownRightIcon className="size-4" />
                    )}
                    Sell
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                    Change stock
                  </Button>
                </div>
                {data && !data.marketOpen && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    The market is closed right now (open 9:15 AM – 3:30 PM IST, Mon–Fri). Orders fill at the
                    last traded price.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">My practice stocks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : !data || data.positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isNew
                ? 'You have not bought anything yet. Tip: try buying a few shares of 3–4 different companies to see how diversification works.'
                : 'You have no open positions. Buy something to get started again.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Avg price</TableHead>
                    <TableHead className="text-right">Price now</TableHead>
                    <TableHead className="text-right">Profit / loss</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.positions.map((p) => (
                    <TableRow key={p.symbol}>
                      <TableCell>
                        <Link href={`/stocks/${p.symbol}`} className="font-medium hover:underline underline-offset-4">
                          {p.symbol}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">
                        {formatInr(p.avgPrice, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatInr(p.ltp, 2)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          p.pnl > 0 && 'text-gain',
                          p.pnl < 0 && 'text-loss'
                        )}
                      >
                        {signed(p.pnl, (v) => formatInr(v))}
                        <span className="block text-[10px]">{signed(p.pnlPercent, (v) => v.toFixed(2))}%</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() =>
                            choose({ symbol: p.symbol, name: p.name, exchange: p.exchange }, p.quantity)
                          }
                        >
                          Trade
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent practice trades</CardTitle>
          </CardHeader>
          <CardContent>
            {!data || data.trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.trades.slice(0, 12).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 text-[10px] uppercase',
                          t.side === 'buy' ? 'border-gain/40 text-gain' : 'border-loss/40 text-loss'
                        )}
                      >
                        {t.side}
                      </Badge>
                      <span className="font-medium">{t.symbol}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {Number(t.quantity)} × {formatInr(Number(t.price), 2)}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpenIcon className="size-4" />
              Words to know
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt className="text-xs font-semibold">{g.term}</dt>
                  <dd className="text-xs text-muted-foreground">{g.def}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground max-w-xl">
          Practice results ignore brokerage, taxes and other charges, and fills may differ from real orders.
          Real investing carries risk. This is for learning, not investment advice.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reset} disabled={resetting || isNew}>
          {resetting ? <Loader2Icon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />}
          Start over
        </Button>
      </div>
    </div>
  );
}
