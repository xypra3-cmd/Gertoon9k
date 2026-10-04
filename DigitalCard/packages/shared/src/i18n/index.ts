import mn from './mn.json';
import en from './en.json';

export type Locale = 'mn' | 'en';
export const LOCALES: readonly Locale[] = ['mn', 'en'];
export const DEFAULT_LOCALE: Locale = 'mn';
export const messages = { mn, en } as const;

type Dict = { [k: string]: string | Dict };

/** Minimal translator: t('card.title'), t('exchange.sent', { name: 'Бат' }). Falls back to MN, then the key. */
export function translate(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const lookup = (dict: Dict): string | undefined => {
    let cur: string | Dict | undefined = dict;
    for (const part of key.split('.')) {
      if (cur === undefined || typeof cur === 'string') return undefined;
      cur = cur[part];
    }
    return typeof cur === 'string' ? cur : undefined;
  };
  const raw = lookup(messages[locale] as Dict) ?? lookup(messages.mn as Dict) ?? key;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, p: string) => String(params[p] ?? `{{${p}}}`));
}
