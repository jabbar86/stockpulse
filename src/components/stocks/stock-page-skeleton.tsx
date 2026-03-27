import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StockChartSkeleton } from '@/components/stocks/stock-chart-skeleton';

export function StockAnalysisPageSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-4 w-32" />

      <div className="space-y-4 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-2.5 max-w-md rounded-full" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <Skeleton className="h-5 w-28" />
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-10" />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <StockChartSkeleton />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <div className="rounded-lg border border-dashed border-border p-8">
          <Skeleton className="mx-auto h-9 w-40" />
        </div>
      </div>
    </div>
  );
}
