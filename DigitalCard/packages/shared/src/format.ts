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
