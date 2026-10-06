import { describe, expect, it } from 'vitest';
import { cardSchema, exchangeSchema, isSafeExternalLink, isStrongPassword, linkSchema, safeNextPath, validateImageFile } from '../src/validation';

describe('linkSchema (SEC-04)', () => {
  it.each(['https://facebook.com/x', 'mailto:a@b.mn', 'tel:+97699112233'])('accepts %s', (url) => {
    expect(linkSchema.safeParse({ kind: 'custom', url }).success).toBe(true);
  });
  it.each([
    'javascript:alert(1)',
    'http://insecure.mn',
    'data:text/html,<script>',
    'https://x.mn/"><script>',
    'ftp://x',
  ])('rejects %s', (url) => {
    expect(linkSchema.safeParse({ kind: 'custom', url }).success).toBe(false);
  });
});

describe('cardSchema', () => {
  const base = {
    slug: 'saraa-g',
    template_id: 'modern',
    color_scheme: 'a',
    first_name: 'Сараа',
    name_format: 'initial',
  };
  it('accepts a minimal card', () => {
    expect(cardSchema.safeParse(base).success).toBe(true);
  });
  it('rejects bad slugs and unknown templates', () => {
    expect(cardSchema.safeParse({ ...base, slug: 'abc' }).success).toBe(false);
    expect(cardSchema.safeParse({ ...base, slug: 'Хүн-123' }).success).toBe(false);
    expect(cardSchema.safeParse({ ...base, template_id: 'neon' }).success).toBe(false);
  });
  it('requires https for website', () => {
    expect(cardSchema.safeParse({ ...base, website: 'http://a.mn' }).success).toBe(false);
    expect(cardSchema.safeParse({ ...base, website: 'https://a.mn' }).success).toBe(true);
  });
});

describe('exchangeSchema', () => {
  const ok = { name: 'Бат', phone: '+97699112233', consent: true as const };
  it('requires consent', () => {
    expect(exchangeSchema.safeParse({ ...ok, consent: false }).success).toBe(false);
  });
  it('requires phone or email', () => {
    expect(exchangeSchema.safeParse({ name: 'Бат', consent: true }).success).toBe(false);
    expect(exchangeSchema.safeParse({ name: 'Бат', email: 'bat@x.mn', consent: true }).success).toBe(true);
  });
  it('limits message to 300 characters', () => {
    expect(exchangeSchema.safeParse({ ...ok, message: 'а'.repeat(301) }).success).toBe(false);
    expect(exchangeSchema.safeParse({ ...ok, message: 'а'.repeat(300) }).success).toBe(true);
  });
});

describe('image upload rules (SEC-05)', () => {
  it('rejects >2MB, svg and exe', () => {
    expect(validateImageFile({ size: 5 * 1024 * 1024, type: 'image/png' })).toBe('errors.fileTooLarge');
    expect(validateImageFile({ size: 1000, type: 'image/svg+xml' })).toBe('errors.fileType');
    expect(validateImageFile({ size: 1000, type: 'application/x-msdownload' })).toBe('errors.fileType');
    expect(validateImageFile({ size: 1000, type: 'image/webp' })).toBe('ok');
  });
});


describe('security helpers', () => {
  it('isStrongPassword: 8+ chars with a letter and a digit', () => {
    expect(isStrongPassword('Demo1234!')).toBe(true);
    expect(isStrongPassword('нууцүг12')).toBe(true);
    expect(isStrongPassword('12345678')).toBe(false);
    expect(isStrongPassword('password')).toBe(false);
    expect(isStrongPassword('a1')).toBe(false);
  });
  it('safeNextPath blocks open redirects', () => {
    expect(safeNextPath('/app/contacts?x=1')).toBe('/app/contacts?x=1');
    for (const bad of ['//evil.com', '/\\evil.com', '/\\/evil.com', 'https://evil.com', 'javascript:alert(1)', '/a\nb', '', null]) {
      expect(safeNextPath(bad)).toBe('/app');
    }
  });
  it('isSafeExternalLink allows bank deep links, blocks script schemes', () => {
    expect(isSafeExternalLink('khanbank://q?qPay_QRcode=abc')).toBe(true);
    expect(isSafeExternalLink('https://qpay.mn/x')).toBe(true);
    expect(isSafeExternalLink('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalLink(' JavaScript:alert(1)')).toBe(false);
    expect(isSafeExternalLink('data:text/html,x')).toBe(false);
    expect(isSafeExternalLink('no-scheme')).toBe(false);
  });
});
