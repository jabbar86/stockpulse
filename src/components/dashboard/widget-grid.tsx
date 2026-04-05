'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface WidgetGridProps {
  children: ReactNode;
  className?: string;
  /** Number of columns on desktop (default: 2) */
  columns?: 1 | 2 | 3 | 4;
}

const GRID_COLS = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
} as const;

export function WidgetGrid({ children, className, columns = 2 }: WidgetGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5',
        GRID_COLS[columns],
        className
      )}
    >
      {children}
    </div>
  );
}

interface WidgetSpanProps {
  children: ReactNode;
  /** How many columns this widget spans (default: 1) */
  span?: 1 | 2 | 3 | 4;
  className?: string;
}

const SPAN_COLS = {
  1: '',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
  4: 'sm:col-span-2 lg:col-span-4',
} as const;

export function WidgetSpan({ children, span = 1, className }: WidgetSpanProps) {
  return (
    <div className={cn(SPAN_COLS[span], className)}>
      {children}
    </div>
  );
}
