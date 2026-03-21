'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { loadJournalMap, saveJournalDay } from '@/lib/today/storage';
import { Loader2Icon } from 'lucide-react';

type JournalCardProps = {
  dateKey: string;
  /** When true, PATCH /api/today/workspace on save */
  syncEnabled: boolean;
  /** Seed from server (bootstrap) */
  cloudInitial: string;
};

export function JournalCard({ dateKey, syncEnabled, cloudInitial }: JournalCardProps) {
  const [text, setText] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const map = loadJournalMap();
    const localToday = map[dateKey] ?? '';
    const merged = cloudInitial.trim() ? cloudInitial : localToday;
    setText(merged);
    setHydrated(true);
  }, [dateKey, cloudInitial]);

  const pushCloud = useCallback(
    async (value: string) => {
      if (!syncEnabled) return;
      setSaving(true);
      try {
        await fetch('/api/today/workspace', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ journalDate: dateKey, journalContent: value }),
        });
      } catch {
        // keep local copy only
      } finally {
        setSaving(false);
      }
    },
    [syncEnabled, dateKey]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (patchTimer.current) clearTimeout(patchTimer.current);
    };
  }, []);

  const onChange = (value: string) => {
    setText(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveJournalDay(dateKey, value);
    }, 400);

    if (patchTimer.current) clearTimeout(patchTimer.current);
    if (syncEnabled) {
      patchTimer.current = setTimeout(() => {
        void pushCloud(value);
      }, 900);
    }
  };

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/[0.03]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base">Today&apos;s note</CardTitle>
          <div className="flex items-center gap-1.5">
            {saving && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
            {syncEnabled ? (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Synced to account
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-normal">
                This device only
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Discipline, plan, or what you&apos;ll avoid — auto-saved here
          {syncEnabled ? ' and to your StockPulse account.' : ' in this browser.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          id="today-journal"
          value={hydrated ? text : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. No new positions unless stop is defined. Review IT allocation this weekend."
          className="min-h-[100px] resize-y text-sm"
          disabled={!hydrated}
        />
        {hydrated && text.trim().length > 0 && !syncEnabled && (
          <p className="mt-2 text-[10px] text-muted-foreground">Also kept in browser storage as backup.</p>
        )}
      </CardContent>
    </Card>
  );
}
