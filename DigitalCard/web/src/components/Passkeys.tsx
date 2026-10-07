// Passkeys (WebAuthn): passwordless, phishing-resistant sign-in with Face ID / Touch ID / Windows Hello
// or a phone. Supabase Auth stores the public keys and runs the ceremony; we never see a secret.
import { useEffect, useEffectEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { formatDate } from '@/lib/dates';
import { Banner } from './ui';
import { Icon } from './icons';

export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && !!navigator.credentials;
}

/** A user closing the browser dialog is not an error worth showing. */
function cancelled(e: unknown): boolean {
  const text = `${(e as { name?: string })?.name ?? ''} ${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? ''}`;
  return /NotAllowedError|AbortError|ERROR_CEREMONY_ABORTED|cancel/i.test(text);
}

/**
 * «Passkey-ээр нэвтрэх» button + browser autofill (Conditional UI): when the email field is focused,
 * the browser itself offers saved passkeys.
 */
export function PasskeySignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest callbacks without re-running the effect (one autofill request per page view).
  const onAutofill = useEffectEvent((ok: boolean, e: unknown) => {
    if (ok) onSignedIn();
    else if (e && !cancelled(e)) setError(errorText(e));
  });
  useEffect(() => {
    if (!passkeysSupported()) return;
    const ctrl = new AbortController();
    void (async () => {
      const available = await PublicKeyCredential.isConditionalMediationAvailable?.().catch(() => false);
      if (!available || ctrl.signal.aborted) return;
      const { data, error: e } = await supabase.auth.signInWithPasskey({
        options: { mediation: 'conditional', signal: ctrl.signal },
      });
      if (!ctrl.signal.aborted) onAutofill(!!data?.session, e);
    })();
    return () => ctrl.abort();
  }, []);

  if (!passkeysSupported()) return null;
  const signIn = async () => {
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.auth.signInWithPasskey();
    setBusy(false);
    if (data?.session) onSignedIn();
    else if (e && !cancelled(e)) setError(errorText(e));
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-slate-400" aria-hidden>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        {t('passkey.or')}
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>
      <button
        type="button"
        className="btn-secondary w-full"
        disabled={busy}
        onClick={() => void signIn()}
        data-testid="passkey-signin"
      >
        <Icon name="fingerprint" width={18} height={18} /> {t('passkey.signIn')}
      </button>
      {error && <Banner tone="error">{error}</Banner>}
    </div>
  );
}

/** Settings: list, add and remove passkeys. */
export function PasskeySettings() {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: ['passkeys'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.passkey.list();
      if (error) throw error;
      return data ?? [];
    },
  });
  const supported = passkeysSupported();

  const add = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.registerPasskey();
    setBusy(false);
    if (error) {
      if (!cancelled(error)) setMsg({ tone: 'error', text: errorText(error) });
      return;
    }
    setMsg({ tone: 'success', text: t('passkey.added') });
    void qc.invalidateQueries({ queryKey: ['passkeys'] });
  };
  const remove = async (id: string) => {
    if (!window.confirm(t('passkey.removeConfirm'))) return;
    const { error } = await supabase.auth.passkey.delete({ passkeyId: id });
    if (error) return setMsg({ tone: 'error', text: errorText(error) });
    void qc.invalidateQueries({ queryKey: ['passkeys'] });
  };
  const fmt = (iso: string) => formatDate(iso, locale);

  return (
    <section className="card space-y-3" aria-labelledby="sec-passkeys" data-testid="passkeys">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sec-passkeys" className="flex items-center gap-2 font-semibold">
          <Icon name="fingerprint" width={18} height={18} /> {t('passkey.title')}
        </h2>
        <span className={`chip ${list.data?.length ? 'bg-emerald-100! text-emerald-800!' : ''}`}>
          {list.data?.length ? t('passkey.count', { n: list.data.length }) : t('security.off')}
        </span>
      </div>
      <p className="text-sm text-slate-500">{t('passkey.text')}</p>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      {list.data && list.data.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {list.data.map((pk) => (
            <li key={pk.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Icon name="fingerprint" width={16} height={16} className="text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{pk.friendly_name || t('passkey.unnamed')}</p>
                <p className="text-xs text-slate-500">
                  {t('passkey.created', { date: fmt(pk.created_at) })}
                  {pk.last_used_at ? ` · ${t('passkey.used', { date: fmt(pk.last_used_at) })}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm text-red-600"
                aria-label={t('passkey.remove')}
                onClick={() => void remove(pk.id)}
              >
                <Icon name="trash" width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => void add()}
          data-testid="passkey-add"
        >
          {t('passkey.add')}
        </button>
      ) : (
        <p className="text-sm text-slate-500">{t('passkey.unsupported')}</p>
      )}
    </section>
  );
}
