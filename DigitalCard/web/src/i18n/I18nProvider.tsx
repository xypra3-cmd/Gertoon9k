import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { messages as sharedMessages, type Locale } from '@digitalcard/shared/i18n';
import webMn from './web.mn.json';
import webEn from './web.en.json';

type Dict = { [k: string]: string | Dict };

const dicts: Record<Locale, Dict> = {
  mn: { ...(sharedMessages.mn as Dict), ...(webMn as Dict) },
  en: { ...(sharedMessages.en as Dict), ...(webEn as Dict) },
};

function lookup(dict: Dict, key: string): string | undefined {
  let cur: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (cur === undefined || typeof cur === 'string') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFunction;
}

const Ctx = createContext<I18nCtx | null>(null);

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem('dc-locale');
    if (saved === 'mn' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'mn';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('dc-locale', l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback<TFunction>(
    (key, params = {}) => {
      const raw = lookup(dicts[locale], key) ?? lookup(dicts.mn, key) ?? key;
      return raw.replace(/\{\{(\w+)\}\}/g, (_, p: string) => String(params[p] ?? ''));
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n outside I18nProvider');
  return ctx;
}
