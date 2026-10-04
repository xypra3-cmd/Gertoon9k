import { Link, Outlet } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/lib/theme';
import { storedAccessToken } from '@/lib/publicApi';
import { LanguageSwitch, ThemeToggle } from './LanguageSwitch';

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight" aria-label="Digital Card">
      <img src="/favicon.svg" alt="" width={28} height={28} />
      <span>Digital Card</span>
    </Link>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
        <span>© {new Date().getFullYear()} Digital Card</span>
        <nav className="flex flex-wrap gap-4" aria-label="legal">
          <Link to="/legal/terms" className="hover:underline">
            {t('landing.terms')}
          </Link>
          <Link to="/legal/privacy" className="hover:underline">
            {t('landing.privacy')}
          </Link>
          <Link to="/legal/refund" className="hover:underline">
            {t('landing.refund')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default function PublicLayout() {
  const { t } = useI18n();
  const { pref, setTheme } = useTheme();
  const signedIn = !!storedAccessToken();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Brand />
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle pref={pref} onChange={setTheme} />
            {signedIn ? (
              <Link to="/app" className="btn-primary btn-sm">
                {t('nav.dashboard')}
              </Link>
            ) : (
              <Link to="/login" className="btn-secondary btn-sm">
                {t('auth.login')}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
