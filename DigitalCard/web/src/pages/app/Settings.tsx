import { useState } from 'react';
import { isStrongPassword } from '@digitalcard/shared/validation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field, Spinner } from '@/components/ui';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { TwoFactorSettings } from '@/components/TwoFactor';

export default function Settings() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const { session, profile, refresh, signOut } = useAuth();
  const { pref, setTheme } = useTheme();
  // Edits are local until saved; untouched fields show the profile values (no effect copying state).
  const [edits, setEdits] = useState<{ name?: string; phone?: string; showName?: boolean }>({});
  const name = edits.name ?? profile?.full_name ?? '';
  const phone = edits.phone ?? profile?.phone ?? '';
  const showName = edits.showName ?? profile?.show_name_to_owners ?? false;
  const setName = (v: string) => setEdits((e) => ({ ...e, name: v }));
  const setPhone = (v: string) => setEdits((e) => ({ ...e, phone: v }));
  const setShowName = (v: boolean) => setEdits((e) => ({ ...e, showName: v }));
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  if (!profile) return <Spinner />;

  const saveProfile = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() || null, phone: phone.trim() || null, show_name_to_owners: showName })
      .eq('id', session!.user.id);
    setMsg(error ? { tone: 'error', text: errorText(error) } : { tone: 'success', text: t('editor.saved') });
    refresh();
  };

  const changePassword = async () => {
    if (!isStrongPassword(password)) return setMsg({ tone: 'error', text: t('authx.passwordMin') });
    const { error } = await supabase.auth.updateUser({ password });
    setPassword('');
    setMsg(error ? { tone: 'error', text: errorText(error) } : { tone: 'success', text: t('editor.saved') });
  };

  const deleteAccount = async () => {
    if (!window.confirm(t('settings.deleteConfirm'))) return;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return setMsg({ tone: 'error', text: errorText(error) });
    await signOut();
    window.location.assign('/');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      <section className="card space-y-4">
        <h2 className="font-semibold">{t('settings.profile')}</h2>
        <Field label={t('authx.fullName')} htmlFor="s-name">
          <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('card.phone')} htmlFor="s-phone">
          <input id="s-phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5"
            checked={showName}
            onChange={(e) => setShowName(e.target.checked)}
          />
          {t('stats.showMyName')}
        </label>
        <button type="button" className="btn-primary" onClick={() => void saveProfile()}>
          {t('common.save')}
        </button>
      </section>
      <section className="card flex flex-wrap items-center gap-6">
        <div>
          <p className="label">{t('common.language')}</p>
          <LanguageSwitch />
        </div>
        <div>
          <p className="label">{t('settings.theme')}</p>
          <div className="flex gap-1">
            {(['light', 'dark', 'system'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={pref === p ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                aria-pressed={pref === p}
                onClick={() => setTheme(p)}
              >
                {t(`settings.${p}`)}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="card space-y-3">
        <h2 className="font-semibold">{t('authx.setPassword')}</h2>
        <Field label={t('authx.newPassword')} htmlFor="s-pw">
          <input
            id="s-pw"
            type="password"
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button type="button" className="btn-secondary" onClick={() => void changePassword()}>
          {t('common.save')}
        </button>
      </section>
      <TwoFactorSettings />
      <section className="card space-y-3 border-red-200 dark:border-red-900">
        <h2 className="font-semibold text-red-700 dark:text-red-400">{t('auth.deleteAccount')}</h2>
        <button type="button" className="btn-danger" onClick={() => void deleteAccount()}>
          {t('auth.deleteAccount')}
        </button>
      </section>
    </div>
  );
}
