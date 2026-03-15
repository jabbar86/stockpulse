'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Stock } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchIcon, TrendingUpIcon, StarIcon } from 'lucide-react';

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

export default function StocksPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleStockClick = (symbol: string) => {
    router.push(`/stocks/${symbol}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stocks</h1>

      {/* Search Input */}
      <div className="relative max-w-lg">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search stocks by symbol or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Search Results */}
      {searching && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!searching && hasSearched && searchResults.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">No stocks found for &quot;{searchQuery}&quot;</p>
          <p className="text-sm text-muted-foreground mt-1">Try searching with a different term.</p>
        </div>
      )}

      {!searching && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  className="flex w-full items-center justify-between px-2 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                  onClick={() => handleStockClick(stock.symbol)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUpIcon className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground">{stock.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{stock.exchange}</Badge>
                    {stock.sector && (
                      <span className="text-xs text-muted-foreground">{stock.sector}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular Stocks */}
      {!hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StarIcon className="size-4 text-yellow-500" />
            <h2 className="text-lg font-semibold">Popular Indian Stocks</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR_STOCKS.map((stock) => (
              <Card
                key={stock.symbol}
                size="sm"
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => handleStockClick(stock.symbol)}
              >
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <span className="text-xs font-bold text-primary">
                      {stock.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{stock.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {stock.exchange}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
