'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownIcon, ArrowUpIcon, StarIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScreenerSnapshot } from '@/lib/screener/filters';

type SortKey = 'symbol' | 'price' | 'changePercent' | 'rsi14' | 'from52wHigh' | 'volumeRatio';

function from52wHigh(s: ScreenerSnapshot): number {
  return s.high52w > 0 ? ((s.price - s.high52w) / s.high52w) * 100 : 0;
}

function sortValue(s: ScreenerSnapshot, key: SortKey): number | string {
  switch (key) {
    case 'symbol':
      return s.symbol;
    case 'from52wHigh':
      return from52wHigh(s);
    case 'rsi14':
      return s.rsi14 ?? -1;
    case 'volumeRatio':
      return s.volumeRatio ?? -1;
    default:
      return s[key];
  }
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function pct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

type Props = {
  rows: ScreenerSnapshot[];
  watchlist: Set<string>;
  onToggleWatchlist: (symbol: string) => void;
};

export function ScreenerResultsTable({ rows, watchlist, onToggleWatchlist }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('changePercent');
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const c = typeof av === 'string' ? av.localeCompare(bv as string) : av - (bv as number);
      return desc ? -c : c;
    });
    return out;
  }, [rows, sortKey, desc]);

  const header = (key: SortKey, label: string, className?: string) => (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => {
          if (key === sortKey) setDesc((d) => !d);
          else {
            setSortKey(key);
            setDesc(key !== 'symbol');
          }
        }}
      >
        {label}
        {sortKey === key &&
          (desc ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />)}
      </button>
    </TableHead>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          {header('symbol', 'Symbol')}
          {header('price', 'Price', 'text-right')}
          {header('changePercent', 'Day', 'text-right')}
          {header('rsi14', 'RSI', 'text-right')}
          <TableHead className="hidden md:table-cell">Trend</TableHead>
          {header('from52wHigh', 'From 52W high', 'text-right hidden sm:table-cell')}
          {header('volumeRatio', 'Vol ×', 'text-right hidden sm:table-cell')}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((s) => {
          const starred = watchlist.has(s.symbol);
          return (
            <TableRow key={s.symbol}>
              <TableCell className="pr-0">
                <button
                  type="button"
                  aria-label={starred ? `Remove ${s.symbol} from watchlist` : `Add ${s.symbol} to watchlist`}
                  onClick={() => onToggleWatchlist(s.symbol)}
                  className="text-muted-foreground hover:text-yellow-500"
                >
                  <StarIcon className={cn('size-4', starred && 'fill-yellow-400 stroke-yellow-500')} />
                </button>
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/stocks/${encodeURIComponent(s.symbol)}`} className="hover:underline">
                  {s.symbol}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">₹{inr.format(s.price)}</TableCell>
              <TableCell
                className={cn('text-right tabular-nums', s.changePercent >= 0 ? 'text-gain' : 'text-loss')}
              >
                {pct(s.changePercent)}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right tabular-nums',
                  s.rsi14 != null && s.rsi14 < 30 && 'text-gain',
                  s.rsi14 != null && s.rsi14 > 70 && 'text-loss'
                )}
              >
                {s.rsi14 != null ? s.rsi14.toFixed(1) : '--'}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex flex-wrap gap-1">
                  {s.sma200 != null && (
                    <Badge variant="outline" className="text-[10px]">
                      {s.price > s.sma200 ? '> 200 DMA' : '< 200 DMA'}
                    </Badge>
                  )}
                  {s.maCross && (
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', s.maCross.type === 'golden' ? 'text-gain' : 'text-loss')}
                    >
                      {s.maCross.type === 'golden' ? 'Golden' : 'Death'} cross
                    </Badge>
                  )}
                  {s.macdCross && (
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', s.macdCross.type === 'bullish' ? 'text-gain' : 'text-loss')}
                    >
                      MACD {s.macdCross.type}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums hidden sm:table-cell">
                {pct(from52wHigh(s))}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden sm:table-cell">
                {s.volumeRatio != null ? `${s.volumeRatio.toFixed(2)}×` : '--'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
