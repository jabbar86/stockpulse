'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SectorData {
  name: string;
  size: number;
  changePercent: number;
}

interface SectorHeatmapProps {
  sectors: Record<string, { changePercent: number; marketCap?: number }[]>;
}

function getColor(change: number): string {
  if (change >= 2) return 'bg-emerald-600';
  if (change >= 1) return 'bg-emerald-500/80';
  if (change >= 0.3) return 'bg-emerald-400/60';
  if (change > -0.3) return 'bg-muted-foreground/20';
  if (change > -1) return 'bg-red-400/60';
  if (change > -2) return 'bg-red-500/80';
  return 'bg-red-600';
}

function getTextColor(change: number): string {
  if (Math.abs(change) < 0.3) return 'text-foreground';
  return 'text-white';
}

export function SectorHeatmap({ sectors }: SectorHeatmapProps) {
  const data = useMemo(() => {
    return Object.entries(sectors).map(([name, stocks]) => {
      const avgChange = stocks.length > 0
        ? stocks.reduce((s, st) => s + st.changePercent, 0) / stocks.length
        : 0;
      return {
        name,
        size: stocks.length,
        changePercent: Math.round(avgChange * 100) / 100,
      };
    }).sort((a, b) => b.size - a.size);
  }, [sectors]);

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {data.map((sector) => (
        <div
          key={sector.name}
          className={cn(
            'rounded-lg px-3 py-3 transition-transform hover:scale-[1.02]',
            getColor(sector.changePercent),
            getTextColor(sector.changePercent)
          )}
        >
          <p className="text-xs font-semibold truncate">{sector.name}</p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
          </p>
          <p className="text-[10px] opacity-80">{sector.size} stocks</p>
        </div>
      ))}
    </div>
  );
}
