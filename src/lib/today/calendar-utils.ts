import type { SipReminder } from '@/lib/today/storage';
import type { BookEventRow } from '@/types/today';

export function daysInGregorianMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** Weekday 0=Sun … 6=Sat for this calendar date in Asia/Kolkata. */
export function istWeekdayIndexSun0(ymd: string): number {
  const inst = new Date(`${ymd}T12:00:00+05:30`);
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  }).format(inst);
  const key = short.slice(0, 3);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[key] ?? 0;
}

export type CalendarCell = {
  dom: number;
  ymd: string;
};

export function buildMonthGrid(year: number, month1to12: number): (CalendarCell | null)[][] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const firstYmd = `${year}-${pad(month1to12)}-01`;
  const startDow = istWeekdayIndexSun0(firstYmd);
  const dim = daysInGregorianMonth(year, month1to12);
  const cells: (CalendarCell | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) {
    cells.push({ dom: d, ymd: `${year}-${pad(month1to12)}-${pad(d)}` });
  }
  const rows: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatMonthTitle(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function remindersForDom(reminders: SipReminder[], dom: number): SipReminder[] {
  return reminders.filter((r) => r.enabled && r.dayOfMonth === dom);
}

export function bookEventsForYmd(events: BookEventRow[] | undefined, ymd: string): BookEventRow[] {
  if (!events?.length) return [];
  return events.filter((e) => e.date === ymd);
}
