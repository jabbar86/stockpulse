'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Item = { name: string; price: number; changePercent: number; fx?: boolean };

function fmt(n: number) {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function pct(n: number) {
  if (!Number.isFinite(n)) return '—';
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

/** Compact strip under the hero — live Nifty / Sensex / USD-INR only. */
export function LandingLiveIndices() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/market/overview');
        if (!res.ok) throw new Error('overview');
        const data = await res.json();
        const indices = (data.indices || []) as Array<{
          name: string;
          price: number;
          changePercent: number;
        }>;
        const pick = (pred: (n: string) => boolean) => indices.find((i) => pred(i.name));
        const nifty = pick((n) => n.includes('NIFTY 50'));
        const sensex = pick((n) => n.includes('SENSEX'));
        const usd = typeof data.usdInrRate === 'number' ? data.usdInrRate : null;
        const out: Item[] = [];
        if (nifty) out.push({ name: 'NIFTY 50', price: nifty.price, changePercent: nifty.changePercent });
        if (sensex) out.push({ name: 'SENSEX', price: sensex.price, changePercent: sensex.changePercent });
        if (usd != null) out.push({ name: 'USD/INR', price: usd, changePercent: 0, fx: true });
        if (!cancelled) setRows(out);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur-sm sm:text-sm">
        Loading market snapshot…
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div
      className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-xs sm:text-sm backdrop-blur-sm"
      aria-live="polite"
    >
      {rows.map((r) => (
        <span key={r.name} className="inline-flex items-center gap-2 tabular-nums">
          <span className="font-medium text-muted-foreground">{r.name}</span>
          <span className="font-semibold">{r.fx ? `₹${fmt(r.price)}` : fmt(r.price)}</span>
          {!r.fx && (
            <span
              className={cn(
                'font-medium',
                r.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {pct(r.changePercent)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
