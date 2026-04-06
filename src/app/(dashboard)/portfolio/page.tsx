'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { HoldingWithMetrics, PortfolioHealthResult } from '@/types';
import { useLivePrices } from '@/hooks/use-live-prices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import HoldingsTable from '@/components/portfolio/holdings-table';
import AddHoldingDialog from '@/components/portfolio/add-holding-dialog';
import CSVImportDialog from '@/components/portfolio/csv-import-dialog';
import {
  PlusIcon,
  Loader2Icon,
  UploadIcon,
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  LayersIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { RiskDashboard } from '@/components/portfolio/risk-dashboard';
import { CorrelationMatrix } from '@/components/portfolio/correlation-matrix';
import { PortfolioSignalsCard } from '@/components/portfolio/portfolio-signals-card';
import { calculateRiskMetrics } from '@/lib/analysis/risk-scoring';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<HoldingWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [health, setHealth] = useState<PortfolioHealthResult | null>(null);

  // Edit state
  const [editHolding, setEditHolding] = useState<HoldingWithMetrics | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deleteHolding, setDeleteHolding] = useState<HoldingWithMetrics | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings || []);
      }
      const healthRes = await fetch('/api/portfolio/health');
      if (healthRes.ok) {
        const { health } = await healthRes.json();
        setHealth(health);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // Live prices
  const holdingSymbols = useMemo(
    () => holdings.map((h) => h.symbol),
    [holdings]
  );
  const { getPrice } = useLivePrices({
    symbols: holdingSymbols,
    enabled: holdingSymbols.length > 0,
  });

  // Merge live prices with holdings (always merge, even after hours for last-known prices)
  const liveHoldings = useMemo(() => {
    return holdings.map((h) => {
      const live = getPrice(h.symbol);
      if (!live) return h;
      const currentPrice = live.price;
      const currentValue = currentPrice * h.quantity;
      const investedValue = h.avg_price * h.quantity;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      return {
        ...h,
        current_price: currentPrice,
        current_value: currentValue,
        pnl,
        pnl_percent: pnlPercent,
        day_change: live.change * h.quantity,
        day_change_percent: live.changePercent,
      };
    });
  }, [holdings, getPrice]);

  // Edit handlers
  const handleEditOpen = (holding: HoldingWithMetrics) => {
    setEditHolding(holding);
    setEditQuantity(String(holding.quantity));
    setEditAvgPrice(String(holding.avg_price));
  };

  const handleEditSubmit = async () => {
    if (!editHolding) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/portfolio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editHolding.id,
          quantity: Number(editQuantity),
          avg_price: Number(editAvgPrice),
        }),
      });
      if (res.ok) {
        setEditHolding(null);
        fetchHoldings();
      }
    } catch {
      // handle silently
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteHolding) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/portfolio`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteHolding.id }),
      });
      if (res.ok) {
        setDeleteHolding(null);
        fetchHoldings();
      }
    } catch {
      // handle silently
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Portfolio totals (use liveHoldings for real-time values)
  const totalValue = liveHoldings.reduce((sum, h) => sum + h.current_value, 0);
  const totalInvested = liveHoldings.reduce((sum, h) => sum + h.invested_value, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const totalDayChange = liveHoldings.reduce((sum, h) => sum + h.day_change, 0);
  const isProfit = totalPnl >= 0;
  const pnlColor = isProfit ? 'text-gain' : 'text-loss';
  const bestPerformer = useMemo(() => {
    if (liveHoldings.length === 0) return null;
    return [...liveHoldings].sort((a, b) => b.pnl_percent - a.pnl_percent)[0];
  }, [liveHoldings]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-3xl font-bold">Portfolio</h1>
        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvOpen(true)}
            className="h-8 sm:h-10 gap-1.5 text-xs sm:text-sm"
          >
            <UploadIcon className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="h-8 sm:h-10 gap-1.5 text-xs sm:text-sm"
          >
            <PlusIcon className="size-3.5" />
            <span className="hidden sm:inline">Add Holding</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Portfolio Summary — 4 stat cards with accent gradient */}
      {!loading && liveHoldings.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <Card className="overflow-hidden">
            <div className="h-1 w-full shrink-0 bg-gradient-to-r from-primary to-primary/60" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Value</span>
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <WalletIcon className="size-4 text-primary" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold tabular-nums">
                {formatCurrency(totalValue)}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className={`h-1 w-full shrink-0 bg-gradient-to-r ${isProfit ? 'from-gain to-gain/60' : 'from-loss to-loss/60'}`} />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total P&L</span>
                <div className={`flex size-8 items-center justify-center rounded-lg ${isProfit ? 'bg-gain/10' : 'bg-loss/10'}`}>
                  {isProfit ? <TrendingUpIcon className="size-4 text-gain" /> : <TrendingDownIcon className="size-4 text-loss" />}
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums ${pnlColor}`}>
                {formatCurrency(totalPnl)}
              </p>
              <p className={`text-xs tabular-nums mt-1 font-medium ${pnlColor}`}>
                {formatPercent(totalPnlPercent)}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className={`h-1 w-full shrink-0 bg-gradient-to-r ${totalDayChange >= 0 ? 'from-gain to-chart-2' : 'from-loss to-chart-3'}`} />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Day Change</span>
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <LayersIcon className="size-4 text-primary" />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums ${totalDayChange >= 0 ? 'text-gain' : 'text-loss'}`}>
                {formatCurrency(totalDayChange)}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="h-1 w-full shrink-0 bg-gradient-to-r from-chart-4 via-primary to-chart-1" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Best Performer</span>
                <div className="flex size-8 items-center justify-center rounded-lg bg-gain/10">
                  <TrendingUpIcon className="size-4 text-gain" />
                </div>
              </div>
              {bestPerformer ? (
                <>
                  <p className="text-xl sm:text-2xl font-bold">{bestPerformer.symbol}</p>
                  <p className="text-xs tabular-nums mt-1 text-gain font-medium">
                    +{formatCurrency(bestPerformer.pnl)}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeframe signals (intraday / swing / long term) + live LTP */}
      {!loading && liveHoldings.length > 0 && (
        <PortfolioSignalsCard symbols={holdingSymbols} getPrice={getPrice} />
      )}

      {/* Holdings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(260px,1fr)]">
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-5 pb-1 sm:pb-3">
            <CardTitle className="text-sm sm:text-lg">Holdings</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-2 sm:pb-6">
            {loading ? (
              <div className="space-y-2 sm:space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <HoldingsTable
                holdings={liveHoldings}
                onEdit={handleEditOpen}
                onDelete={(h) => setDeleteHolding(h)}
              />
            )}
          </CardContent>
        </Card>

        {health && (
          <Card className="h-fit">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base">
                Recommended Moves
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              {health.suggestions.slice(0, 3).map((sugg) => (
                <div
                  key={sugg.id}
                  className="rounded-lg border px-3 py-2 text-left"
                >
                  <p className="text-xs sm:text-sm font-semibold">
                    {sugg.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {sugg.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Risk Dashboard & Correlation Matrix */}
      {!loading && liveHoldings.length >= 2 && (
        <div className="space-y-4">
          <RiskDashboard metrics={calculateRiskMetrics(liveHoldings)} />
          <CorrelationMatrix holdingSymbols={liveHoldings.map((h) => h.symbol)} />
        </div>
      )}

      {/* Add Holding Dialog */}
      <AddHoldingDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={fetchHoldings}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onSuccess={fetchHoldings}
      />

      {/* Edit Holding Dialog */}
      <Dialog open={!!editHolding} onOpenChange={(open) => !open && setEditHolding(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Holding</DialogTitle>
            <DialogDescription>
              Update {editHolding?.symbol} holding details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                step="1"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-avg-price">Average Price (INR)</Label>
              <Input
                id="edit-avg-price"
                type="number"
                min="0.01"
                step="0.01"
                value={editAvgPrice}
                onChange={(e) => setEditAvgPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditHolding(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteHolding} onOpenChange={(open) => !open && setDeleteHolding(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Holding</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deleteHolding?.symbol} ({deleteHolding?.name}) from
              your portfolio? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteHolding(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSubmitting}>
              {deleteSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
