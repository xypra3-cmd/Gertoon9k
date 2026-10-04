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
