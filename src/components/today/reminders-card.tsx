'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatYmdDisplay, istYmd } from '@/lib/today/ist';
import {
  loadReminders,
  newReminderId,
  reminderNextYmd,
  saveReminders as saveLocalReminders,
  type SipReminder,
} from '@/lib/today/storage';
import { PlusIcon, Trash2Icon, Loader2Icon } from 'lucide-react';
import { MonthCalendar } from '@/components/today/month-calendar';
import type { BookEventRow } from '@/types/today';

type RemindersCardProps = {
  syncEnabled: boolean;
  cloudInitial: SipReminder[];
  /** Optional earnings/dividend dates for the month grid */
  bookEvents?: BookEventRow[];
};

export function RemindersCard({ syncEnabled, cloudInitial, bookEvents }: RemindersCardProps) {
  const [list, setList] = useState<SipReminder[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [dom, setDom] = useState('1');
  const [note, setNote] = useState('');
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const local = loadReminders();
    setList(cloudInitial.length > 0 ? cloudInitial : local);
    setHydrated(true);
  }, [cloudInitial]);

  const pushCloud = useCallback(
    async (next: SipReminder[]) => {
      if (!syncEnabled) return;
      setSaving(true);
      try {
        await fetch('/api/today/workspace', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminders: next }),
        });
      } catch {
        // local still updated
      } finally {
        setSaving(false);
      }
    },
    [syncEnabled]
  );

  const persist = useCallback(
    (next: SipReminder[]) => {
      setList(next);
      saveLocalReminders(next);
      if (patchTimer.current) clearTimeout(patchTimer.current);
      if (syncEnabled) {
        patchTimer.current = setTimeout(() => {
          void pushCloud(next);
        }, 650);
      }
    },
    [syncEnabled, pushCloud]
  );

  useEffect(() => {
    return () => {
      if (patchTimer.current) clearTimeout(patchTimer.current);
    };
  }, []);

  const todayYmd = useMemo(() => istYmd(), []);

  const addReminder = () => {
    const day = Math.min(28, Math.max(1, Number(dom) || 1));
    const trimmed = label.trim();
    if (!trimmed) return;
    persist([
      ...list,
      {
        id: newReminderId(),
        label: trimmed,
        dayOfMonth: day,
        note: note.trim() || undefined,
        enabled: true,
      },
    ]);
    setLabel('');
    setNote('');
    setDom('1');
  };

  const upcoming = useMemo(() => {
    if (!hydrated) return [];
    return list
      .filter((r) => r.enabled)
      .map((r) => {
        const next = reminderNextYmd(r, todayYmd);
        return { r, next: next! };
      })
      .filter((x) => x.next)
      .sort((a, b) => a.next.localeCompare(b.next))
      .slice(0, 6);
  }, [list, hydrated, todayYmd]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base">SIP & monthly reminders</CardTitle>
          <div className="flex items-center gap-1.5">
            {saving && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />}
            {syncEnabled ? (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Synced
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-normal">
                Local
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          SIP or bill dates (day of month). {syncEnabled ? 'Stored on your account.' : 'Stored on this device.'} The
          month view marks reminder days and earnings/dividend dates from your book.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hydrated && (
          <MonthCalendar reminders={list} bookEvents={bookEvents} />
        )}
        {hydrated && upcoming.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Upcoming</p>
            <ul className="mt-2 space-y-1.5">
              {upcoming.map(({ r, next }) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="font-medium truncate">{r.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatYmdDisplay(next)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="rem-label" className="text-xs">
                Label
              </Label>
              <Input
                id="rem-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Parag Parikh SIP"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5 sm:w-24">
              <Label htmlFor="rem-dom" className="text-xs">
                Day
              </Label>
              <Input
                id="rem-dom"
                type="number"
                min={1}
                max={28}
                value={dom}
                onChange={(e) => setDom(e.target.value)}
                className="h-9 tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rem-note" className="text-xs">
              Note (optional)
            </Label>
            <Input
              id="rem-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bank account / UPI"
              className="h-9"
            />
          </div>
          <Button type="button" size="sm" className="w-full sm:w-auto gap-1.5" onClick={addReminder}>
            <PlusIcon className="size-4" />
            Add reminder
          </Button>
        </div>

        {hydrated && list.length > 0 && (
          <ul className="space-y-2">
            {list.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Day {r.dayOfMonth} of each month
                    {r.note ? ` · ${r.note}` : ''}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`en-${r.id}`}
                      checked={r.enabled}
                      onCheckedChange={(on) => {
                        persist(list.map((x) => (x.id === r.id ? { ...x, enabled: on } : x)));
                      }}
                    />
                    <Label htmlFor={`en-${r.id}`} className="text-xs text-muted-foreground">
                      On
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${r.label}`}
                    onClick={() => persist(list.filter((x) => x.id !== r.id))}
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
