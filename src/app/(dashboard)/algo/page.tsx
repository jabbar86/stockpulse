'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { AlgoTradeIntent } from '@/types';
import { BotIcon, FlaskConicalIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function sideClass(side: AlgoTradeIntent['side']): string {
  if (side === 'buy') return 'border-gain/40 bg-gain/10 text-gain';
  if (side === 'sell') return 'border-loss/40 bg-loss/10 text-loss';
  return 'border-muted-foreground/30 bg-muted/50 text-muted-foreground';
}

export default function AlgoTradingPage() {
  const [maxInr, setMaxInr] = useState('25000');
  const [withAi, setWithAi] = useState(true);
  const [strictConsensus, setStrictConsensus] = useState(false);
  const [minConsensusConviction, setMinConsensusConviction] = useState('60');
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [intents, setIntents] = useState<AlgoTradeIntent[]>([]);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [persistedIds, setPersistedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<
    {
      id: string;
      created_at: string;
      symbol: string;
      side: string;
      quantity: number | null;
      reference_price: number | null;
      rationale: string | null;
    }[]
  >([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/algo/trading/paper?limit=30');
      if (!res.ok) return;
      const json = await res.json();
      setHistory(json.trades || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const runEvaluate = async () => {
    setLoading(true);
    setAiError(null);
    setPersistedIds([]);
    try {
      const res = await fetch('/api/algo/trading/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxInrPerTrade: Number(maxInr) || 25000,
          withAi,
          strictConsensus,
          minConsensusConviction: Number(minConsensusConviction) || 60,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      setIntents(json.intents || []);
      setGeneratedAt(json.generatedAt || null);
      setAiNote(json.ai?.portfolio_note ?? null);
      setAiModel(json.ai?.model ?? null);
      setAiError(json.aiError || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const runPaper = async () => {
    setPersisting(true);
    setAiError(null);
    try {
      const res = await fetch('/api/algo/trading/paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxInrPerTrade: Number(maxInr) || 25000,
          withAi,
          persist: true,
          strictConsensus,
          minConsensusConviction: Number(minConsensusConviction) || 60,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      setIntents(json.intents || []);
      setGeneratedAt(json.generatedAt || null);
      setAiNote(json.ai?.portfolio_note ?? null);
      setAiModel(json.ai?.model ?? null);
      setAiError(json.aiError || null);
      setPersistedIds(json.persistedIds || []);
      await loadHistory();
    } catch {
      // ignore
    } finally {
      setPersisting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 pb-24 md:px-6 md:pb-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BotIcon className="size-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">AI algo (paper)</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Combines rule-based swing signals with the same AI layer as portfolio signals, then outputs
          simulated buy / sell / hold intents. Orders are <strong>not</strong> sent to any broker — this is a
          paper book for research and journaling. A weekday cron can append paper legs (strict
          consensus by default) when <code className="text-xs">CRON_SECRET</code> is configured.
        </p>
      </div>

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardContent className="pt-4 text-xs text-muted-foreground leading-relaxed">
          Live algorithmic execution via API keys is not enabled. Broker connections in StockPulse sync
          holdings only. Do not treat outputs as investment advice.
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConicalIcon className="size-4" />
            Run planner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="max-inr">Max notional per buy (INR)</Label>
              <Input
                id="max-inr"
                type="number"
                min={1000}
                step={1000}
                value={maxInr}
                onChange={(e) => setMaxInr(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={withAi}
                onChange={(e) => setWithAi(e.target.checked)}
                className="rounded border-input"
              />
              Include AI synthesis (same providers as portfolio signals)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-2">
              <input
                type="checkbox"
                checked={strictConsensus}
                onChange={(e) => setStrictConsensus(e.target.checked)}
                className="rounded border-input"
              />
              Strict consensus — only trade when rule + AI swing agree, each ≥ min conviction
            </label>
            {strictConsensus && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="min-conv">Min conviction (rule &amp; AI, each)</Label>
                <Input
                  id="min-conv"
                  type="number"
                  min={40}
                  max={95}
                  step={1}
                  value={minConsensusConviction}
                  onChange={(e) => setMinConsensusConviction(e.target.value)}
                  className="max-w-[120px]"
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runEvaluate} disabled={loading || persisting}>
              {loading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
              Preview intents
            </Button>
            <Button type="button" variant="secondary" onClick={runPaper} disabled={loading || persisting}>
              {persisting ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Run &amp; log paper trades
            </Button>
          </div>
          {generatedAt && (
            <p className="text-[10px] text-muted-foreground">
              Engine time {new Date(generatedAt).toLocaleString('en-IN')}
            </p>
          )}
          {aiNote && (
            <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-left">
              <p className="text-[10px] font-semibold text-primary">
                AI portfolio note {aiModel && <span className="font-normal text-muted-foreground">· {aiModel}</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{aiNote}</p>
            </div>
          )}
          {aiError && (
            <p className="text-xs text-amber-700 dark:text-amber-400">AI: {aiError}</p>
          )}
          {persistedIds.length > 0 && (
            <p className="text-xs text-muted-foreground">Logged {persistedIds.length} paper leg(s).</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Intents (swing horizon)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && intents.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : intents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add holdings and run the planner. Intents use swing signals plus optional AI alignment.
            </p>
          ) : (
            <div className="space-y-2">
              {intents.map((row) => (
                <div
                  key={`${row.symbol}-${row.side}-${row.rationale.slice(0, 12)}`}
                  className="rounded-lg border px-3 py-2.5 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{row.symbol}</span>
                    <Badge variant="outline" className={cn('text-[10px] h-5', sideClass(row.side))}>
                      {row.side.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{row.source}</span>
                    {row.quantity > 0 && (
                      <span className="text-xs tabular-nums">
                        Qty {row.quantity} · ref {formatInr(row.reference_price)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 leading-snug">{row.rationale}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Paper trade log</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paper trades logged yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((t) => (
                <li key={t.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                  <span className="font-medium text-xs sm:text-sm">
                    {t.symbol}{' '}
                    <span className={cn('uppercase text-[10px]', sideClass(t.side as AlgoTradeIntent['side']))}>
                      {t.side}
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {new Date(t.created_at).toLocaleString('en-IN')}
                  </span>
                  <p className="w-full text-[10px] text-muted-foreground line-clamp-2">{t.rationale}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
