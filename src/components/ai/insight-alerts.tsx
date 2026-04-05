'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { route } from '@/lib/ai/router';
import type { HoldingWithMetrics } from '@/types';
import { BrainIcon, TrendingUpIcon, AlertTriangleIcon, ZapIcon } from 'lucide-react';

interface Insight {
  type: 'opportunity' | 'risk' | 'info';
  title: string;
  description: string;
}

interface InsightAlertsProps {
  holdings: HoldingWithMetrics[];
}

const ICONS = {
  opportunity: TrendingUpIcon,
  risk: AlertTriangleIcon,
  info: ZapIcon,
};

const COLORS = {
  opportunity: 'text-emerald-600',
  risk: 'text-amber-600',
  info: 'text-blue-600',
};

export default function InsightAlerts({ holdings }: InsightAlertsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (holdings.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const topHoldings = holdings
          .slice(0, 5)
          .map((h) => `${h.symbol}: P&L ${h.pnl_percent.toFixed(1)}%, day ${h.day_change_percent.toFixed(1)}%`)
          .join('; ');

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Given these portfolio positions: ${topHoldings}

Generate 2-3 brief, actionable insights as a JSON array. Each insight should have:
- "type": "opportunity" | "risk" | "info"
- "title": short title (5-8 words)
- "description": one sentence

Respond ONLY with valid JSON array, no markdown.`,
            }],
          }),
        });

        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }

        if (cancelled) return;

        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }

        const parsed = JSON.parse(cleaned) as Insight[];
        if (Array.isArray(parsed)) {
          setInsights(parsed.slice(0, 3));
        }
      } catch {
        // Non-critical feature
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [holdings]);

  if (!loading && insights.length === 0) return null;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BrainIcon className="size-4 text-primary" />
          <CardTitle className="text-sm sm:text-lg">AI Insights</CardTitle>
          <Badge variant="secondary" className="text-[10px]">Beta</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, i) => {
              const Icon = ICONS[insight.type];
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
                >
                  <Icon className={`size-4 mt-0.5 shrink-0 ${COLORS[insight.type]}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
