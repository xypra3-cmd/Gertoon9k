import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/lib/theme';
import { LanguageSwitch, ThemeToggle } from './LanguageSwitch';
import { Brand } from './PublicLayout';
import { MenuIcon, XIcon } from './icons';
import { Spinner } from './ui';

export default function AppLayout() {
  const { session, loading, entitlements, signOut } = useAuth();
  const { t } = useI18n();
  const { pref, setTheme } = useTheme();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  if (loading) return <Spinner />;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;

  const isOrgAdmin = entitlements?.orgs.some(
    (o) => o.status === 'active' && (o.role === 'owner' || o.role === 'admin'),
  );
  const items = [
    { to: '/app', label: t('nav.dashboard'), end: true },
    { to: '/app/contacts', label: t('nav.contacts') },
    { to: '/app/stats', label: t('nav.stats') },
    { to: '/app/billing', label: t('nav.billing') },
    { to: '/app/org', label: t('nav.org'), hidden: !isOrgAdmin && !(entitlements?.orgs.length === 0) },
    { to: '/app/settings', label: t('nav.settings') },
    { to: '/admin', label: t('nav.admin'), hidden: !entitlements?.is_admin },
  ].filter((i) => !i.hidden);

  const nav = (
    <nav aria-label="main" className="flex flex-col gap-1 md:flex-row md:items-center">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-fast ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
          }
        >
          {i.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Brand />
          <div className="hidden md:block">{nav}</div>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle pref={pref} onChange={setTheme} />
            <button type="button" className="btn-ghost btn-sm hidden md:inline-flex" onClick={() => void signOut()}>
              {t('auth.logout')}
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm md:hidden"
              aria-expanded={open}
              aria-label="menu"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 md:hidden">
            {nav}
            <button type="button" className="btn-ghost mt-2 w-full" onClick={() => void signOut()}>
              {t('auth.logout')}
            </button>
          </div>
        )}
      </header>
      <main key={loc.pathname} className="mx-auto max-w-6xl animate-fade-up px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
