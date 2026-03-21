import { nextOccurrenceYmd } from '@/lib/today/ist';

const JOURNAL_KEY = 'stockpulse_today_journal_v1';
const REMINDERS_KEY = 'stockpulse_today_reminders_v1';

export type JournalMap = Record<string, string>;

export interface SipReminder {
  id: string;
  label: string;
  dayOfMonth: number;
  note?: string;
  enabled: boolean;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadJournalMap(): JournalMap {
  if (typeof window === 'undefined') return {};
  return safeParse<JournalMap>(localStorage.getItem(JOURNAL_KEY), {});
}

export function saveJournalDay(dateKey: string, text: string): void {
  if (typeof window === 'undefined') return;
  const map = loadJournalMap();
  const t = text.trim();
  if (t) map[dateKey] = text;
  else delete map[dateKey];
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(map));
}

export function loadReminders(): SipReminder[] {
  if (typeof window === 'undefined') return [];
  return safeParse<SipReminder[]>(localStorage.getItem(REMINDERS_KEY), []);
}

export function saveReminders(list: SipReminder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
}

export function newReminderId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function reminderNextYmd(reminder: SipReminder, todayYmd: string): string | null {
  if (!reminder.enabled) return null;
  return nextOccurrenceYmd(reminder.dayOfMonth, todayYmd);
}
