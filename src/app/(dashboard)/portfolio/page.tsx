'use client';

import { useEffect, useState, useCallback } from 'react';
import type { HoldingWithMetrics } from '@/types';
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
} from 'lucide-react';

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
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

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

  // Portfolio totals
  const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.invested_value, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const totalDayChange = holdings.reduce((sum, h) => sum + h.day_change, 0);
  const isProfit = totalPnl >= 0;
  const pnlColor = isProfit
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

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

      {/* Portfolio Summary Cards */}
      {!loading && holdings.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-6 sm:rounded-lg sm:border sm:p-4">
          <div className="rounded-lg border p-3 sm:border-0 sm:p-0">
            <div className="flex items-center gap-1.5 sm:block">
              <WalletIcon className="size-3.5 text-muted-foreground sm:hidden" />
              <p className="text-[10px] sm:text-sm text-muted-foreground">Total Value</p>
            </div>
            <p className="text-sm sm:text-lg font-bold tabular-nums mt-0.5">
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div className="rounded-lg border p-3 sm:border-0 sm:p-0">
            <div className="flex items-center gap-1.5 sm:block">
              <LayersIcon className="size-3.5 text-muted-foreground sm:hidden" />
              <p className="text-[10px] sm:text-sm text-muted-foreground">Invested</p>
            </div>
            <p className="text-sm sm:text-lg font-bold tabular-nums mt-0.5">
              {formatCurrency(totalInvested)}
            </p>
          </div>
          <div className="rounded-lg border p-3 sm:border-0 sm:p-0">
            <div className="flex items-center gap-1.5 sm:block">
              {isProfit ? (
                <TrendingUpIcon className="size-3.5 text-green-500 sm:hidden" />
              ) : (
                <TrendingDownIcon className="size-3.5 text-red-500 sm:hidden" />
              )}
              <p className="text-[10px] sm:text-sm text-muted-foreground">Total P&L</p>
            </div>
            <p className={`text-sm sm:text-lg font-bold tabular-nums mt-0.5 ${pnlColor}`}>
              {formatCurrency(totalPnl)}
            </p>
            <p className={`text-[10px] sm:text-sm ${pnlColor}`}>
              {formatPercent(totalPnlPercent)}
            </p>
          </div>
          <div className="rounded-lg border p-3 sm:border-0 sm:p-0">
            <p className="text-[10px] sm:text-sm text-muted-foreground">Holdings</p>
            <p className="text-sm sm:text-lg font-bold mt-0.5">{holdings.length}</p>
          </div>
        </div>
      )}

      {/* Holdings */}
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
              holdings={holdings}
              onEdit={handleEditOpen}
              onDelete={(h) => setDeleteHolding(h)}
            />
          )}
        </CardContent>
      </Card>

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
