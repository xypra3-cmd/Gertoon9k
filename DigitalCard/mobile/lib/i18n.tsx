import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { messages, type Locale } from '@digitalcard/shared/i18n';
import mobileMn from './i18n.mn.json';
import mobileEn from './i18n.en.json';

type Dict = { [k: string]: string | Dict };
const dicts: Record<Locale, Dict> = {
  mn: { ...(messages.mn as Dict), ...(mobileMn as Dict) },
  en: { ...(messages.en as Dict), ...(mobileEn as Dict) },
};

const lookup = (d: Dict, key: string) => {
  let cur: string | Dict | undefined = d;
  for (const p of key.split('.')) {
    if (cur === undefined || typeof cur === 'string') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
};

export type T = (key: string, params?: Record<string, string | number>) => string;
interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: T;
}
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const device = getLocales()[0]?.languageCode === 'en' ? 'en' : 'mn';
  const [locale, setLocaleState] = useState<Locale>(device);
  useEffect(() => {
    void AsyncStorage.getItem('dc-locale').then((v) => (v === 'mn' || v === 'en') && setLocaleState(v));
  }, []);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    void AsyncStorage.setItem('dc-locale', l);
  }, []);
  const t = useCallback<T>(
    (key, params = {}) => (lookup(dicts[locale], key) ?? lookup(dicts.mn, key) ?? key).replace(/\{\{(\w+)\}\}/g, (_, p: string) => String(params[p] ?? '')),
    [locale],
  );
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error('useI18n outside provider');
  return c;
}
