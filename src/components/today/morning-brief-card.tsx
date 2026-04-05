'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SparklesIcon, RefreshCwIcon, Loader2Icon } from 'lucide-react';

interface BriefContent {
  text: string;
  generated_at: string;
}

export function MorningBriefCard() {
  const [brief, setBrief] = useState<BriefContent | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchBrief(force = false) {
    const setter = force ? setRegenerating : setLoading;
    setter(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/morning-brief', {
        method: force ? 'POST' : 'GET',
        cache: 'no-store',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError((err as { error?: string }).error || 'Could not load brief');
        return;
      }

      const data = await res.json();
      setBrief(data.brief);
      setModel(data.model || null);
    } catch {
      setError('Network error loading brief');
    } finally {
      setter(false);
    }
  }

  useEffect(() => {
    fetchBrief();
  }, []);

  return (
    <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.04] to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            <CardTitle className="text-sm sm:text-lg">Morning Brief</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {model && (
              <span className="text-[10px] text-muted-foreground">{model}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchBrief(true)}
              disabled={regenerating || loading}
              className="h-7 gap-1 text-xs"
            >
              {regenerating ? (
                <Loader2Icon className="size-3 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-3" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : brief ? (
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>p]:text-sm [&>ul]:text-sm"
            dangerouslySetInnerHTML={{
              __html: brief.text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br />'),
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
