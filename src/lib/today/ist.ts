/** Calendar date in Asia/Kolkata as `YYYY-MM-DD`. */
export function istYmd(date: Date = new Date()): string {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = f.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function formatIstLong(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function istHour(date: Date = new Date()): number {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hour12: false,
  });
  return Number(f.formatToParts(date).find((p) => p.type === 'hour')?.value ?? '12');
}

export function greetingForIstHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good evening';
}

function daysInCalendarMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/** Next calendar date (YYYY-MM-DD) when a monthly reminder on `dayOfMonth` falls, from `todayYmd` (IST). */
export function nextOccurrenceYmd(dayOfMonth: number, todayYmd: string): string {
  const [y, mo, d] = todayYmd.split('-').map(Number);
  const dim = daysInCalendarMonth(y, mo);
  const clamped = Math.min(Math.max(1, dayOfMonth), dim);
  if (d <= clamped) {
    return `${y}-${String(mo).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
  }
  let nm = mo + 1;
  let ny = y;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  const dim2 = daysInCalendarMonth(ny, nm);
  const c2 = Math.min(Math.max(1, dayOfMonth), dim2);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(c2).padStart(2, '0')}`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatYmdDisplay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return ymd;
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

/** UTC instant of 00:00 IST on the IST calendar day containing `date`. */
export function istDayStartUtc(date: Date = new Date()): Date {
  return new Date(`${istYmd(date)}T00:00:00+05:30`);
}
