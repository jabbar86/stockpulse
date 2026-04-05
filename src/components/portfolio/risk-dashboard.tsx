'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ShieldIcon, ActivityIcon, TrendingUpIcon } from 'lucide-react';
import type { RiskMetrics } from '@/lib/analysis/risk-scoring';

interface RiskDashboardProps {
  metrics: RiskMetrics;
}

function RiskGauge({ score }: { score: number }) {
  const label =
    score < 30 ? 'Low' : score < 60 ? 'Moderate' : score < 80 ? 'High' : 'Very High';
  const color =
    score < 30
      ? 'text-emerald-600'
      : score < 60
      ? 'text-amber-600'
      : 'text-red-600';
  const bgColor =
    score < 30
      ? 'bg-emerald-500'
      : score < 60
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-28">
        <svg viewBox="0 0 100 60" className="w-full">
          {/* Background arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-muted/30"
          />
          {/* Score arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 126} 126`}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={cn('text-2xl font-bold tabular-nums', color)}>{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <Badge variant="outline" className={cn('text-xs', color)}>
        {label} Risk
      </Badge>
    </div>
  );
}

export function RiskDashboard({ metrics }: RiskDashboardProps) {
  const items = [
    {
      icon: ActivityIcon,
      label: 'Volatility',
      value: `${metrics.volatility.toFixed(1)}%`,
      detail: 'Annualized',
      score: metrics.breakdown.volatility,
    },
    {
      icon: TrendingUpIcon,
      label: 'Beta',
      value: metrics.beta.toFixed(2),
      detail: 'vs Nifty 50',
      score: metrics.breakdown.beta,
    },
    {
      icon: ShieldIcon,
      label: 'Concentration',
      value: metrics.hhi.toLocaleString(),
      detail: 'HHI score',
      score: metrics.breakdown.concentration,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <ShieldIcon className="size-4 text-primary" />
          Portfolio Risk
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          <RiskGauge score={metrics.score} />
          <div className="flex-1 grid grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.label} className="text-center">
                <item.icon className="mx-auto size-4 text-muted-foreground" />
                <p className="mt-1 text-lg font-bold tabular-nums">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
