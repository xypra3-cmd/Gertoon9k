// vCard 3.0 generator. UTF-8 (Cyrillic-safe), CRLF line endings, 75-octet line folding
// that never splits a multi-byte character. CHARSET=UTF-8 is added on text properties for
// older Android contact importers; iOS ignores it.
import type { CardData } from './types';
import { displayName } from './format';

const encoder = new TextEncoder();

/** RFC 2426 text escaping */
export function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Fold a content line at 75 octets (UTF-8), continuation lines start with a single space. */
export function foldLine(line: string): string {
  const out: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;
  for (const ch of Array.from(line)) {
    const b = encoder.encode(ch).length;
    if (currentBytes + b > limit) {
      out.push(current);
      current = ' ';
      currentBytes = 1;
      limit = 75;
    }
    current += ch;
    currentBytes += b;
  }
  out.push(current);
  return out.join('\r\n');
}

type VCardInput = Pick<
  CardData,
  | 'firstName'
  | 'lastName'
  | 'nameFormat'
  | 'title'
  | 'company'
  | 'phone'
  | 'email'
  | 'website'
  | 'address'
  | 'bio'
  | 'links'
> & { avatarUrl?: string | null; publicUrl?: string | null };

export function buildVCard(card: VCardInput): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
  const t = (prop: string, value: string | null | undefined) => {
    if (value && value.trim()) lines.push(`${prop};CHARSET=UTF-8:${escapeText(value.trim())}`);
  };

  lines.push(`N;CHARSET=UTF-8:${escapeText(card.lastName ?? '')};${escapeText(card.firstName)};;;`);
  lines.push(`FN;CHARSET=UTF-8:${escapeText(displayName({ ...card, nameFormat: 'full' }))}`);
  t('ORG', card.company);
  t('TITLE', card.title);
  if (card.phone) lines.push(`TEL;TYPE=CELL,VOICE:${card.phone.replace(/[^0-9+]/g, '')}`);
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET,PREF:${card.email.trim()}`);
  if (card.website) lines.push(`URL:${card.website}`);
  if (card.address) lines.push(`ADR;CHARSET=UTF-8;TYPE=WORK:;;${escapeText(card.address)};;;;`);
  const items = card.links
    .filter((l) => l.url.startsWith('https://'))
    .map((l) => ({ url: l.url, label: l.label || l.kind }));
  if (card.publicUrl) items.unshift({ url: card.publicUrl, label: 'Digital Card' });
  items.forEach((l, i) => {
    lines.push(`item${i + 1}.URL:${l.url}`);
    lines.push(`item${i + 1}.X-ABLabel;CHARSET=UTF-8:${escapeText(l.label)}`);
  });
  t('NOTE', card.bio);
  if (card.avatarUrl && card.avatarUrl.startsWith('https://')) lines.push(`PHOTO;VALUE=URI:${card.avatarUrl}`);
  lines.push('END:VCARD');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function vcardFileName(slug: string): string {
  return `${slug.replace(/[^a-z0-9-]/g, '') || 'contact'}.vcf`;
}

export const VCARD_MIME = 'text/vcard;charset=utf-8';
