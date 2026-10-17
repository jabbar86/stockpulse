'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellRingIcon, BellIcon, Loader2Icon, Trash2Icon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatInr, type AlertDirection, type PriceAlert } from '@/lib/alerts/price-alerts';

interface PriceAlertsCardProps {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  currentPrice?: number;
}

export function PriceAlertsCard({ symbol, exchange, currentPrice }: PriceAlertsCardProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/alerts?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  // Prefill target with the current price once it is known
  useEffect(() => {
    if (currentPrice && !target) setTarget(currentPrice.toFixed(2));
  }, [currentPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(target);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid target price');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          exchange,
          direction,
          target_price: value,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Could not create alert', {
          description: typeof data.error === 'string' ? data.error : undefined,
        });
        return;
      }
      setAlerts((prev) => [data.item, ...prev]);
      setNote('');
      toast.success(`Alert set: ${symbol} ${direction} ${formatInr(value)}`, {
        description: 'You will get a notification in the bell when it triggers.',
      });
    } catch {
      toast.error('Could not create alert');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = alerts;
    setAlerts((a) => a.filter((x) => x.id !== id));
    const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      setAlerts(prev);
      toast.error('Could not delete alert');
    }
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <BellIcon className="size-4" />
          Price alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex shrink-0 rounded-lg border border-border p-0.5">
            {(['above', 'below'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm capitalize transition-colors',
                  direction === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <Input
            type="number"
            inputMode="decimal"
            step="0.05"
            min="0"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target ₹"
            aria-label="Target price"
            className="sm:w-32"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Note (optional)"
            aria-label="Alert note"
            className="sm:flex-1"
          />
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <BellRingIcon className="size-4" />}
            Set alert
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alerts for {symbol}. Alerts are checked during NSE market hours.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium tabular-nums">
                    {a.direction === 'above' ? 'Above' : 'Below'} {formatInr(a.target_price)}
                  </p>
                  {a.note && <p className="truncate text-xs text-muted-foreground">{a.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.triggered_at ? (
                    <Badge className="bg-primary/12 text-primary">
                      Triggered{a.triggered_price ? ` at ${formatInr(a.triggered_price)}` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete alert"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
