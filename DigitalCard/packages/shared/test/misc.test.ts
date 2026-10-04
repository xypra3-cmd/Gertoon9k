import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import mn from '../src/i18n/mn.json';
import { KNOWN_ERROR_KEYS, errorKey } from '../src/errors';
import { displayName, initials } from '../src/format';
import { translate } from '../src/i18n';
import { planMonthlyAmount } from '../src/plans';
import { TEMPLATES, TEMPLATE_IDS } from '../src/templates';

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe('i18n', () => {
  it('MN and EN have the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(mn).sort());
  });
  it('has a message for every DB error key', () => {
    for (const k of KNOWN_ERROR_KEYS) expect(keys(mn)).toContain(`errors.${k}`);
  });
  it('interpolates params', () => {
    expect(translate('mn', 'exchange.sent', { name: 'Сараа' })).toBe('Таны мэдээллийг Сараа-д илгээлээ');
    expect(translate('en', 'missing.key')).toBe('missing.key');
  });
});

describe('errors', () => {
  it('maps DB errors to i18n keys', () => {
    expect(errorKey({ code: '42501', message: 'card_quota_exceeded' })).toBe('errors.card_quota_exceeded');
    expect(errorKey({ code: '42501', message: 'new row violates row-level security policy for table "cards"' })).toBe(
      'errors.forbidden',
    );
    expect(errorKey({ status: 'owner_limit_reached' })).toBe('errors.owner_limit_reached');
    expect(errorKey(null)).toBe('errors.generic');
  });
});

describe('format', () => {
  it('formats Mongolian names', () => {
    expect(displayName({ firstName: 'Бат', lastName: 'Болд', nameFormat: 'initial' })).toBe('Б.Бат');
    expect(displayName({ firstName: 'Бат', lastName: 'Болд', nameFormat: 'full' })).toBe('Болд Бат');
    expect(displayName({ firstName: 'Бат', lastName: null, nameFormat: 'initial' })).toBe('Бат');
    expect(initials('сараа', 'ганбаатар')).toBe('ГС');
  });
});

describe('templates & plans', () => {
  it('has 10 templates, each with 2 color variants', () => {
    expect(TEMPLATES).toHaveLength(10);
    expect(TEMPLATES.map((t) => t.id)).toEqual([...TEMPLATE_IDS]);
    for (const t of TEMPLATES) expect(Object.keys(t.colors)).toEqual(['a', 'b']);
  });
  it('computes team price per seat with minimum seats', () => {
    const team = { id: 'team', price_mnt: 0, price_per_seat_mnt: 5000, min_seats: 5 };
    expect(planMonthlyAmount(team, 3)).toBe(25000);
    expect(planMonthlyAmount(team, 12)).toBe(60000);
    expect(planMonthlyAmount({ id: 'pro', price_mnt: 9900, price_per_seat_mnt: 0, min_seats: 1 })).toBe(9900);
  });
});

import { generateSlug, slugify } from '../src/format';
import { slugSchema } from '../src/validation';

describe('slugs', () => {
  it('transliterates Mongolian Cyrillic', () => {
    expect(slugify('Сараа Ганбаатар')).toBe('saraa-ganbaatar');
    expect(slugify('Өлзий Хүрэл')).toBe('ulzii-khurel');
  });
  it('always produces a valid slug', () => {
    for (const n of ['', 'А', 'Сараа', 'x'.repeat(80), '!!!'])
      expect(slugSchema.safeParse(generateSlug(n)).success).toBe(true);
  });
});

describe('template colors are readable (WCAG AA 4.5:1 for text on background)', () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x! + 0.05) / (y! + 0.05);
  };
  for (const t of TEMPLATES)
    for (const scheme of ['a', 'b'] as const)
      it(`${t.id}/${scheme}`, () => {
        const c = t.colors[scheme];
        for (const k of ['fg', 'accent', 'muted'] as const) expect(ratio(c[k], c.bg)).toBeGreaterThanOrEqual(4.5);
      });
});
