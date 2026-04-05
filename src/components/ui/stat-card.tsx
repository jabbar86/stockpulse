import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon?: LucideIcon;
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ icon: Icon, title, value, subtitle, trend, className }: StatCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600'
      : trend === 'down'
      ? 'text-red-600'
      : '';

  return (
    <div
      className={cn(
        'rounded-xl border bg-card px-3.5 py-3 sm:px-4 sm:py-3.5 flex flex-col gap-1',
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-muted-foreground shrink-0" />}
        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
          {title}
        </p>
      </div>
      <p className={cn('text-base sm:text-xl font-bold tabular-nums', trendColor)}>
        {value}
      </p>
      {subtitle && (
        <p className={cn('text-[10px] sm:text-xs tabular-nums', trendColor || 'text-muted-foreground')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
