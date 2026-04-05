'use client';

import { useMemo } from 'react';
import { calculateFibonacciLevels } from '@/lib/analysis/technical-extended';
import type { HistoricalDataPoint } from '@/types';
import { cn } from '@/lib/utils';

interface FibonacciOverlayProps {
  data: HistoricalDataPoint[];
  currentPrice: number;
}

const LEVEL_COLORS: Record<string, string> = {
  '0%': 'text-emerald-600',
  '23.6%': 'text-blue-500',
  '38.2%': 'text-blue-600',
  '50%': 'text-amber-600',
  '61.8%': 'text-orange-600',
  '78.6%': 'text-red-500',
  '100%': 'text-red-600',
};

export function FibonacciOverlay({ data, currentPrice }: FibonacciOverlayProps) {
  const fib = useMemo(() => calculateFibonacciLevels(data), [data]);

  if (!fib) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Swing: ₹{fib.swingLow.toFixed(2)} — ₹{fib.swingHigh.toFixed(2)}</span>
      </div>
      <div className="space-y-1">
        {fib.levels.map((level) => {
          const isNear = Math.abs(level.price - currentPrice) / currentPrice < 0.02;
          return (
            <div
              key={level.label}
              className={cn(
                'flex items-center justify-between rounded-md px-2.5 py-1 text-xs',
                isNear ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/20'
              )}
            >
              <span className={cn('font-medium', LEVEL_COLORS[level.label] || 'text-foreground')}>
                {level.label}
              </span>
              <span className="font-mono tabular-nums">₹{level.price.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
