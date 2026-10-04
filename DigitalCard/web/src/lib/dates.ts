// Dates in Asia/Ulaanbaatar (UTC+8, no DST) — matches the database's day boundaries.
const UB_OFFSET_MS = 8 * 3600_000;

export function ubToday(now = new Date()): string {
  return new Date(now.getTime() + UB_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400_000);
}

export type StatsRange = 'today' | '7d' | '30d' | 'all';

/** Start timestamp of a range (UB midnight based). null = all time. */
export function rangeStart(range: StatsRange, now = new Date()): string | null {
  if (range === 'all') return null;
  const days = range === 'today' ? 0 : range === '7d' ? 6 : 29;
  const day = addDays(ubToday(now), -days);
  return new Date(Date.parse(`${day}T00:00:00Z`) - UB_OFFSET_MS).toISOString();
}

export function formatDate(iso: string | null | undefined, locale: 'mn' | 'en'): string {
  if (!iso) return '';
  const day = iso.length === 10 ? iso : ubToday(new Date(iso));
  if (locale === 'mn') return day.replace(/-/g, '.'); // 2026.10.04
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );
}
