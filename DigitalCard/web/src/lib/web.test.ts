import { describe, expect, it } from 'vitest';
import { addDays, formatDate, rangeStart, ubToday } from './dates';
import { toCsv } from './download';
import webMn from '@/i18n/web.mn.json';
import webEn from '@/i18n/web.en.json';
import { sumStats } from '@/pages/app/Stats';

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe('dates (Asia/Ulaanbaatar)', () => {
  it('uses UB day boundaries', () => {
    expect(ubToday(new Date('2026-10-04T16:30:00Z'))).toBe('2026-10-05');
    expect(ubToday(new Date('2026-10-04T15:59:00Z'))).toBe('2026-10-04');
  });
  it('ranges are nested: all ⊇ 30d ⊇ 7d ⊇ today', () => {
    const now = new Date('2026-10-04T03:00:00Z');
    const [d30, d7, today] = [rangeStart('30d', now)!, rangeStart('7d', now)!, rangeStart('today', now)!];
    expect(rangeStart('all', now)).toBeNull();
    expect(d30 <= d7 && d7 <= today).toBe(true);
    expect(today).toBe('2026-10-03T16:00:00.000Z');
  });
  it('formats dates', () => {
    expect(formatDate('2026-10-04', 'mn')).toBe('2026.10.04');
    expect(formatDate('2026-10-04', 'en')).toBe('4 Oct 2026');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
});

describe('csv export', () => {
  it('escapes quotes/commas, keeps Cyrillic, blocks formula injection', () => {
    const csv = toCsv([{ name: 'Бат, "Болд"', note: '=HYPERLINK("x")', tags: ['a', 'b'] }], ['name', 'note', 'tags']);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Бат, ""Болд"""');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('a; b');
  });
});

describe('stats', () => {
  it('sums card rows and keeps total = views + qr', () => {
    const row = (o: number, v: number, q: number) => ({
      card_id: 'x',
      total_opens: o,
      views: v,
      qr_opens: q,
      unique_visitors: 1,
      link_clicks: 0,
      contact_saves: 0,
      exchanges: 0,
      followups: 0,
      top_link_kind: null,
      top_link_clicks: 0,
    });
    const s = sumStats([row(3, 2, 1), row(5, 1, 4)]);
    expect(s.total_opens).toBe(s.views + s.qr_opens);
  });
});

describe('web i18n', () => {
  it('MN and EN have the same keys', () => {
    expect(keys(webEn).sort()).toEqual(keys(webMn).sort());
  });
});
