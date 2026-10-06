import { Icon } from './icons';
import { useI18n } from '@/i18n/I18nProvider';

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex rounded-lg border border-slate-300 p-0.5 text-xs font-semibold dark:border-slate-700"
    >
      {(['mn', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`min-h-[32px] min-w-[36px] rounded-md px-2 ${locale === l ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle({
  pref,
  onChange,
}: {
  pref: 'light' | 'dark' | 'system';
  onChange: (p: 'light' | 'dark' | 'system') => void;
}) {
  const { t } = useI18n();
  // "system" follows the OS, so the button must flip what the user actually sees.
  const showingDark =
    pref === 'dark' ||
    (pref === 'system' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const next = showingDark ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={() => onChange(next)}
      aria-label={`${t('settings.theme')}: ${t(`settings.${next}`)}`}
    >
      <Icon name={showingDark ? 'sun' : 'moon'} width={18} height={18} aria-hidden="true" />
    </button>
  );
}
