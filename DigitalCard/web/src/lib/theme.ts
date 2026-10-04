import { useCallback, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => {
    try {
      const v = localStorage.getItem('dc-theme');
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  });
  const set = useCallback((p: ThemePref) => {
    setPref(p);
    try {
      if (p === 'system') localStorage.removeItem('dc-theme');
      else localStorage.setItem('dc-theme', p);
    } catch {
      /* ignore */
    }
    apply(p);
  }, []);
  return { pref, setTheme: set };
}
