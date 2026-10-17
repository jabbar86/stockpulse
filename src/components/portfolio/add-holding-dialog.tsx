'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Stock } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchIcon, Loader2Icon, CheckIcon } from 'lucide-react';

interface AddHoldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddHoldingDialog({ open, onOpenChange, onSuccess }: AddHoldingDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Debounced search
  const searchStocks = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/stocks?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || data.stocks || []);
      }
    } catch {
      // silently fail search
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchStocks(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchStocks]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedStock(null);
      setQuantity('');
      setAvgPrice('');
      setBuyDate('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedStock) {
      setError('Please select a stock');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (!avgPrice || Number(avgPrice) <= 0) {
      setError('Please enter a valid average price');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          exchange: selectedStock.exchange,
          quantity: Number(quantity),
          avg_price: Number(avgPrice),
          source: 'manual',
          ...(buyDate ? { buy_date: buyDate } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add holding');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Holding</DialogTitle>
          <DialogDescription>Search for a stock and add it to your portfolio.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stock Search */}
          <div className="space-y-2">
            <Label htmlFor="stock-search">Stock</Label>
            {selectedStock ? (
              <div className="flex items-center justify-between rounded-lg border p-2">
                <div>
                  <p className="font-medium">{selectedStock.symbol}</p>
                  <p className="text-xs text-muted-foreground">{selectedStock.name}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStock(null);
                    setSearchQuery('');
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="stock-search"
                    placeholder="Search by symbol or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  {searching && (
                    <Loader2Icon className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {searchResults.map((stock) => (
                      <button
                        key={stock.symbol}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedStock(stock);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                      >
                        <span className="font-medium">{stock.symbol}</span>
                        <span className="text-muted-foreground truncate">{stock.name}</span>
                        <Badge className="ml-auto text-xs">{stock.exchange}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="e.g. 10"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Average Price */}
          <div className="space-y-2">
            <Label htmlFor="avg-price">Average Price (INR)</Label>
            <Input
              id="avg-price"
              type="number"
              placeholder="e.g. 2500.00"
              min="0.01"
              step="0.01"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
            />
          </div>

          {/* Buy date (optional, for capital-gains estimate) */}
          <div className="space-y-2">
            <Label htmlFor="buy-date">
              Buy date <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="buy-date"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used to estimate short- vs long-term capital gains. Leave blank to use today&apos;s date.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedStock}>
              {submitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Holding'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Inline Badge for search results (avoids importing shadcn Badge with render prop complexity)
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium ${className || ''}`}
    >
      {children}
    </span>
  );
}
