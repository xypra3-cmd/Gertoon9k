import { describe, expect, it } from 'vitest';
import { cardSchema, exchangeSchema, linkSchema, validateImageFile } from '../src/validation';

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
