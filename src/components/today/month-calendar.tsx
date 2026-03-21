'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { istYmd } from '@/lib/today/ist';
import {
  buildMonthGrid,
  formatMonthTitle,
  shiftMonth,
  remindersForDom,
  bookEventsForYmd,
} from '@/lib/today/calendar-utils';
import type { SipReminder } from '@/lib/today/storage';
import type { BookEventRow } from '@/types/today';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type MonthCalendarProps = {
  reminders: SipReminder[];
  bookEvents?: BookEventRow[];
};

export function MonthCalendar({ reminders, bookEvents }: MonthCalendarProps) {
  const todayYmd = useMemo(() => istYmd(), []);
  const [ty, tm] = useMemo(() => {
    const [y, m] = todayYmd.split('-').map(Number);
    return [y, m] as const;
  }, [todayYmd]);

  const [cursor, setCursor] = useState({ year: ty, month: tm });
  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor.year, cursor.month]);

  const title = formatMonthTitle(cursor.year, cursor.month);
  const isCurrentMonth = cursor.year === ty && cursor.month === tm;

  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-tight sm:text-sm">{title}</p>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Previous month"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[10px] font-medium text-muted-foreground"
            disabled={isCurrentMonth}
            aria-label="Jump to this month"
            onClick={() => setCursor({ year: ty, month: tm })}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Next month"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground sm:gap-1 sm:text-[11px]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-0.5 grid gap-0.5 sm:gap-1">
        {grid.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {row.map((cell, ci) => {
              if (!cell) {
                return <div key={`e-${ri}-${ci}`} className="aspect-square min-h-[2.25rem]" />;
              }
              const sip = remindersForDom(reminders, cell.dom);
              const book = bookEventsForYmd(bookEvents, cell.ymd);
              const isToday = cell.ymd === todayYmd;
              const hasMark = sip.length > 0 || book.length > 0;

              const titleParts: string[] = [];
              if (sip.length) titleParts.push(sip.map((r) => r.label).join(', '));
              if (book.length) titleParts.push(book.map((b) => `${b.symbol} (${b.type})`).join(', '));

              return (
                <div
                  key={cell.ymd}
                  title={titleParts.length ? titleParts.join(' · ') : undefined}
                  className={cn(
                    'flex aspect-square min-h-[2.25rem] flex-col items-center justify-center rounded-md border border-transparent text-xs tabular-nums sm:text-sm',
                    isToday && 'border-primary/50 bg-primary/[0.06] font-semibold text-primary',
                    !isToday && hasMark && 'bg-muted/40'
                  )}
                >
                  <span>{cell.dom}</span>
                  <span className="mt-0.5 flex h-2 justify-center gap-0.5" aria-hidden>
                    {sip.length > 0 && (
                      <span className="size-1.5 rounded-full bg-primary" title="SIP / reminder" />
                    )}
                    {book.length > 0 && (
                      <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" title="Book event" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          SIP / monthly
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
          Earnings / dividend
        </span>
      </div>
    </div>
  );
}
