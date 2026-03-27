import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StockChartSkeletonProps = {
  className?: string;
};

export function StockChartSkeleton({ className }: StockChartSkeletonProps) {
  return (
    <div
      className={cn(
        'flex h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20',
        className
      )}
    >
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">Loading chart</p>
    </div>
  );
}
