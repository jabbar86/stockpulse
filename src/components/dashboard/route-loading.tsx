import { Skeleton } from '@/components/ui/skeleton';
import { Loader2Icon } from 'lucide-react';

type RouteLoadingProps = {
  /** Shown next to the spinner (e.g. "Loading market…") */
  label?: string;
};

/**
 * Default skeleton while a dashboard route segment loads (Next.js loading.tsx).
 */
export function RouteLoading({ label = 'Loading…' }: RouteLoadingProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Skeleton className="h-8 w-44 max-w-[85vw] rounded-lg sm:h-9 sm:w-56" />
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl sm:h-28" />
        ))}
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-xl sm:h-64" />
        <Skeleton className="h-56 rounded-xl sm:h-64" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl sm:h-40" />
    </div>
  );
}
