'use client';

import type { HoldingWithMetrics } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, Trash2Icon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface HoldingsTableProps {
  holdings: HoldingWithMetrics[];
  onEdit: (holding: HoldingWithMetrics) => void;
  onDelete: (holding: HoldingWithMetrics) => void;
}

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

export default function HoldingsTable({ holdings, onEdit, onDelete }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No holdings yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add your first holding to start tracking your portfolio.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Stock</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Avg Price</TableHead>
          <TableHead className="text-right">Current Price</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead className="text-right">P&L</TableHead>
          <TableHead className="text-right">P&L %</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding) => {
          const isProfit = holding.pnl >= 0;
          const pnlColor = isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

          return (
            <TableRow key={holding.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-medium">{holding.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {holding.name}
                    </p>
                  </div>
                  {holding.source !== 'manual' && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {holding.source}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">{holding.quantity}</TableCell>
              <TableCell className="text-right">{formatCurrency(holding.avg_price)}</TableCell>
              <TableCell className="text-right">{formatCurrency(holding.current_price)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(holding.current_value)}
              </TableCell>
              <TableCell className={`text-right font-medium ${pnlColor}`}>
                <div className="flex items-center justify-end gap-1">
                  {isProfit ? (
                    <TrendingUpIcon className="size-3.5" />
                  ) : (
                    <TrendingDownIcon className="size-3.5" />
                  )}
                  {formatCurrency(Math.abs(holding.pnl))}
                </div>
              </TableCell>
              <TableCell className={`text-right font-medium ${pnlColor}`}>
                {formatPercent(holding.pnl_percent)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onEdit(holding)}
                    title="Edit"
                  >
                    <PencilIcon className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(holding)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
