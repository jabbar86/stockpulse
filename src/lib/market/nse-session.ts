/**
 * NSE calendar session in IST + shared cache TTL policy for market APIs.
 * Used by /api/market/prices and /api/market/overview in-memory caches.
 */

// NSE holidays (MM-DD) — keep in sync across routes
export const NSE_HOLIDAYS_MM_DD = new Set([
  '01-26',
  '02-26',
  '03-14',
  '03-31',
  '04-10',
  '04-14',
  '04-18',
  '05-01',
  '06-27',
  '08-15',
  '08-16',
  '08-27',
  '10-02',
  '10-20',
  '10-21',
  '10-22',
  '11-05',
  '11-26',
  '12-25',
]);

export type NseSession = {
  isOpen: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  /** IST calendar date YYYY-MM-DD — for invalidating cache on day change */
  istDateKey: string;
};

function getISTParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  let hour = get('hour');
  // Some Intl locales emit 24 for midnight; normalize so session window math is correct.
  if (hour === 24) hour = 0;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
  };
}

export function getNseSession(now: Date = new Date()): NseSession {
  const ist = getISTParts(now);
  const dayOfWeek = new Date(Date.UTC(ist.year, ist.month - 1, ist.day)).getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const mmdd = `${String(ist.month).padStart(2, '0')}-${String(ist.day).padStart(2, '0')}`;
  const isHoliday = NSE_HOLIDAYS_MM_DD.has(mmdd);

  if (isWeekend || isHoliday) {
    return {
      isOpen: false,
      isWeekend,
      isHoliday,
      istDateKey: `${ist.year}-${String(ist.month).padStart(2, '0')}-${String(ist.day).padStart(2, '0')}`,
    };
  }

  const mins = ist.hour * 60 + ist.minute;
  const isOpen = mins >= 555 && mins <= 930; // 9:15–15:30 IST

  return {
    isOpen,
    isWeekend: false,
    isHoliday: false,
    istDateKey: `${ist.year}-${String(ist.month).padStart(2, '0')}-${String(ist.day).padStart(2, '0')}`,
  };
}

/**
 * Mon–Fri 9:00–16:00 IST — background news scrape window (wider than NSE hours).
 * Weekends off; NSE holidays still get scrapes so headlines stay current.
 */
export function isNewsRefreshWindow(now: Date = new Date()): boolean {
  const ist = getISTParts(now);
  const dayOfWeek = new Date(Date.UTC(ist.year, ist.month - 1, ist.day)).getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  const mins = ist.hour * 60 + ist.minute;
  return mins >= 540 && mins <= 960;
}

/** How long quote Map entries are considered “fresh” before refetching Yahoo */
export function getPriceCacheFreshTtlMs(session: NseSession): number {
  if (session.isOpen) return 15_000;
  if (session.isWeekend || session.isHoliday) return 2 * 60 * 60 * 1000; // 2h — market shut
  return 30 * 60 * 1000; // 30m after-hours weekday
}

/**
 * When market is closed, still serve in-memory quotes up to this age (avoids hammering Yahoo on polls).
 * Zero when open (no stale path).
 */
export function getPriceCacheStaleMaxMs(session: NseSession): number {
  if (session.isOpen) return 0;
  if (session.isWeekend || session.isHoliday) return 12 * 60 * 60 * 1000; // 12h
  return 3 * 60 * 60 * 1000; // 3h after-hours
}

/** Full JSON payload cache for /api/market/overview */
export function getOverviewCacheTtlMs(session: NseSession): number {
  if (session.isOpen) return 5 * 60 * 1000;
  if (session.isWeekend || session.isHoliday) return 2 * 60 * 60 * 1000;
  return 45 * 60 * 1000; // 45m after hours (slightly longer than before 30m)
}
