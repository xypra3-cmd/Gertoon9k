// Display helpers shared by templates, vCard and apps.

/** Mongolian convention: "initial" → "Б.Бат", "full" → "Болд Бат". */
export function displayName(card: {
  firstName: string;
  lastName: string | null;
  nameFormat: 'initial' | 'full';
}): string {
  const first = card.firstName.trim();
  const last = (card.lastName ?? '').trim();
  if (!last) return first;
  if (card.nameFormat === 'full') return `${last} ${first}`;
  return `${Array.from(last)[0]}.${first}`;
}

/** Initials for an avatar placeholder when there is no photo. */
export function initials(firstName: string, lastName?: string | null): string {
  const a = Array.from(firstName.trim())[0] ?? '';
  const b = Array.from((lastName ?? '').trim())[0] ?? '';
  return (b + a).toUpperCase() || '?';
}

const MN_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  ө: 'u',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ү: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

/** Cyrillic → latin slug base: "Сараа Ганбаатар" → "saraa-ganbaatar". */
export function slugify(text: string): string {
  return Array.from(text.toLowerCase())
    .map((ch) => MN_LATIN[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

/** A unique-enough card slug (6–40 chars, a-z0-9-). */
export function generateSlug(name: string, random: () => number = Math.random): string {
  const base = slugify(name) || 'card';
  const suffix = Array.from({ length: 4 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(random() * 32)]).join(
    '',
  );
  const slug = `${base}-${suffix}`;
  return slug.length >= 6 ? slug : `${slug}-dc`;
}
