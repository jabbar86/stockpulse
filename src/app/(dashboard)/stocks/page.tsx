'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOptionalNavigationPending } from '@/components/dashboard/navigation-pending-context';
import type { Stock } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchIcon, StarIcon } from 'lucide-react';
import { useLivePrices } from '@/hooks/use-live-prices';

const POPULAR_STOCKS: Stock[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE' },
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE' },
];

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '--';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function StocksPage() {
  const router = useRouter();
  const navPending = useOptionalNavigationPending();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set());

  const searchStocks = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/stocks?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchStocks(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchStocks]);

  useEffect(() => {
    async function fetchWatchlist() {
      try {
        const res = await fetch('/api/watchlist');
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items || []) as { symbol: string }[];
        setWatchlistSymbols(new Set(items.map((i) => i.symbol.toUpperCase())));
      } catch {
        // ignore
      }
    }
    fetchWatchlist();
  }, []);

  const toggleFavorite = async (stock: Stock) => {
    const symbol = stock.symbol.toUpperCase();
    const isFav = watchlistSymbols.has(symbol);
    try {
      if (isFav) {
        const res = await fetch(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' });
        if (res.ok) {
          setWatchlistSymbols((prev) => {
            const next = new Set(prev);
            next.delete(symbol);
            return next;
          });
        }
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            name: stock.name,
            exchange: stock.exchange,
          }),
        });
        if (res.ok) {
          setWatchlistSymbols((prev) => {
            const next = new Set(prev);
            next.add(symbol);
            return next;
          });
        }
      }
    } catch {
      // ignore
    }
  };

  const handleStockClick = (symbol: string, exchange?: string) => {
    const params = exchange === 'BSE' ? '?exchange=BSE' : '';
    const href = `/stocks/${symbol}${params}`;
    if (navPending) {
      navPending.navigate(href);
    } else {
      router.push(href);
    }
  };

  const watchlistArray = useMemo(
    () =>
      POPULAR_STOCKS.filter((s) => watchlistSymbols.has(s.symbol.toUpperCase())),
    [watchlistSymbols]
  );

  const { getPrice } = useLivePrices({
    symbols: watchlistArray.map((w) => w.symbol),
    enabled: watchlistArray.length > 0,
  });

  const renderStarButton = (stock: Stock) => {
    const active = watchlistSymbols.has(stock.symbol.toUpperCase());
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(stock);
        }}
        className={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs transition-colors ${
          active
            ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-600'
            : 'bg-transparent border-muted text-muted-foreground hover:bg-muted/40'
        }`}
      >
        <StarIcon
          className={`size-3.5 ${
            active ? 'fill-yellow-400 stroke-yellow-500' : ''
          }`}
        />
      </button>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Stocks</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Discover Indian stocks and build your watchlist.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur">
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search stocks by symbol or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline text-[10px] text-muted-foreground">
            Press / to search
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(260px,1fr)]">
        {/* Left: search results + popular */}
        <div className="space-y-4 sm:space-y-6">
          {/* Search Results */}
          {searching && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!searching && hasSearched && searchResults.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  No stocks found for &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs text-muted-foreground">
                  Try a different symbol or company name.
                </p>
              </CardContent>
            </Card>
          )}

          {!searching && searchResults.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Search Results ({searchResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {searchResults.slice(0, 8).map((stock) => (
                  <button
                    key={stock.symbol}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                    onClick={() => handleStockClick(stock.symbol, stock.exchange)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">
                          {stock.symbol}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {stock.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {renderStarButton(stock)}
                      <Badge variant="outline" className="text-[10px]">
                        {stock.exchange}
                      </Badge>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Popular Stocks */}
          {!hasSearched && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarIcon className="size-4 text-yellow-500" />
                  <div>
                    <h2 className="text-sm sm:text-lg font-semibold">
                      Popular Indian Large Caps
                    </h2>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      NIFTY names most Indian investors track. Tap ★ to add to your list.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {POPULAR_STOCKS.map((stock) => (
                  <Card
                    key={stock.symbol}
                    size="sm"
                    className="cursor-pointer border border-border/70 hover:border-primary/40 hover:shadow-sm transition-all"
                    onClick={() => handleStockClick(stock.symbol)}
                  >
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs sm:text-sm truncate">
                          {stock.symbol}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {stock.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {renderStarButton(stock)}
                        <Badge variant="outline" className="h-5 px-2 text-[10px]">
                          {stock.exchange}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: watchlist sidebar */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">
              Your Watchlist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {watchlistArray.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">
                No favourites yet. Use the ★ on any stock to add it here.
              </p>
            ) : (
              <div className="space-y-1.5">
                {watchlistArray.map((stock) => {
                  const live = getPrice(stock.symbol);
                  return (
                    <button
                      key={stock.symbol}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-muted/60 transition-colors"
                      onClick={() => handleStockClick(stock.symbol, stock.exchange)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">
                          {stock.symbol}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {stock.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-semibold tabular-nums">
                          {live ? live.price.toFixed(2) : '--'}
                        </p>
                        <p
                          className={`text-[10px] tabular-nums ${
                            live && live.changePercent >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {live ? formatPercent(live.changePercent) : '--'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
