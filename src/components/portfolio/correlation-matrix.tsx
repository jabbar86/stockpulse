'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { GridIcon } from 'lucide-react';

interface CorrelationData {
  symbols: string[];
  matrix: number[][];
}

interface CorrelationMatrixProps {
  holdingSymbols: string[];
}

function getCellColor(corr: number): string {
  if (corr >= 0.7) return 'bg-red-500/70 text-white';
  if (corr >= 0.4) return 'bg-red-400/40';
  if (corr >= 0.1) return 'bg-red-300/20';
  if (corr > -0.1) return 'bg-muted/20';
  if (corr > -0.4) return 'bg-blue-300/20';
  if (corr > -0.7) return 'bg-blue-400/40';
  return 'bg-blue-500/70 text-white';
}

export function CorrelationMatrix({ holdingSymbols }: CorrelationMatrixProps) {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (holdingSymbols.length < 2) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/portfolio/correlation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: holdingSymbols.slice(0, 10) }),
        });

        if (!res.ok) {
          setError('Could not load correlation data');
          return;
        }

        const result = await res.json();
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [holdingSymbols]);

  if (holdingSymbols.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <GridIcon className="size-4 text-primary" />
          Correlation Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : data ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs">
              <thead>
                <tr>
                  <th className="px-1 py-1" />
                  {data.symbols.map((s) => (
                    <th key={s} className="px-1 py-1 font-medium text-center truncate max-w-[60px]">
                      {s.replace('.NS', '').replace('.BO', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.symbols.map((rowSym, i) => (
                  <tr key={rowSym}>
                    <td className="px-1 py-1 font-medium truncate max-w-[60px]">
                      {rowSym.replace('.NS', '').replace('.BO', '')}
                    </td>
                    {data.matrix[i].map((corr, j) => (
                      <td
                        key={j}
                        className={cn(
                          'px-1 py-1 text-center rounded-sm font-mono tabular-nums',
                          i === j ? 'bg-muted/30' : getCellColor(corr)
                        )}
                      >
                        {i === j ? '—' : corr.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded-sm bg-blue-500/70" /> Negative
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded-sm bg-muted/20" /> Uncorrelated
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-3 rounded-sm bg-red-500/70" /> Positive
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
