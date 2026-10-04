import { describe, expect, it } from 'vitest';
import { buildVCard, escapeText, foldLine } from '../src/vcard';

const card = {
  firstName: 'Сараа',
  lastName: 'Ганбаатар',
  nameFormat: 'initial' as const,
  title: 'Даатгалын зөвлөх',
  company: 'Мандал Даатгал, ХХК',
  phone: '+976 8800-1122',
  email: 'saraa@example.mn',
  website: 'https://saraa.example.mn',
  address: 'Улаанбаатар; ХУД',
  bio: 'Амь нас, эрүүл мэндийн даатгалын зөвлөгөө.\nШинэ мөр.',
  links: [
    { kind: 'facebook' as const, label: 'Facebook', url: 'https://facebook.com/x' },
    { kind: 'custom' as const, label: null, url: 'tel:+97699' },
  ],
  publicUrl: 'https://digitalcard.mn/c/saraa-g',
};

describe('vCard 3.0', () => {
  const v = buildVCard(card);

  it('has the required structure with CRLF line endings', () => {
    expect(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(v.endsWith('END:VCARD\r\n')).toBe(true);
    expect(v.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });

  it('keeps Cyrillic names intact (UTF-8)', () => {
    const unfolded = v.replace(/\r\n /g, '');
    expect(unfolded).toContain('N;CHARSET=UTF-8:Ганбаатар;Сараа;;;');
    expect(unfolded).toContain('FN;CHARSET=UTF-8:Ганбаатар Сараа');
    expect(unfolded).toContain('TITLE;CHARSET=UTF-8:Даатгалын зөвлөх');
  });

  it('escapes commas, semicolons and newlines', () => {
    const unfolded = v.replace(/\r\n /g, '');
    expect(unfolded).toContain('ORG;CHARSET=UTF-8:Мандал Даатгал\\, ХХК');
    expect(unfolded).toContain('ADR;CHARSET=UTF-8;TYPE=WORK:;;Улаанбаатар\\; ХУД;;;;');
    expect(unfolded).toContain('зөвлөгөө.\\nШинэ мөр.');
    expect(escapeText('a\\b')).toBe('a\\\\b');
  });

  it('normalises the phone number and only exports https links', () => {
    expect(v).toContain('TEL;TYPE=CELL,VOICE:+97688001122');
    expect(v).toContain('item1.URL:https://digitalcard.mn/c/saraa-g');
    expect(v).toContain('item2.URL:https://facebook.com/x');
    expect(v).not.toContain('tel:+97699');
  });

  it('folds lines at 75 octets without splitting multi-byte characters', () => {
    const long = 'NOTE;CHARSET=UTF-8:' + 'Өөөөөөөөөө'.repeat(20);
    const folded = foldLine(long);
    const enc = new TextEncoder();
    for (const line of folded.split('\r\n')) {
      expect(enc.encode(line).length).toBeLessThanOrEqual(75);
      expect(line).not.toContain('�');
    }
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });
});
