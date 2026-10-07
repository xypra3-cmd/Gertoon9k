// Optional two-factor authentication (TOTP) for every user. Platform admins must use it (aal2 in the DB).
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field } from './ui';
import { LockIcon } from './icons';

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <Field label={t('security.code')} htmlFor="totp-code">
      <input
        id="totp-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className="input text-center text-xl tracking-[0.5em]"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
    </Field>
  );
}

/** Blocks the app until a user with a verified factor completes the second step for this session. */
export function MfaGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [state, setState] = useState<'checking' | 'ok' | 'challenge'>('checking');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
        const f = await supabase.auth.mfa.listFactors();
        setFactorId(f.data?.totp.find((x) => x.status === 'verified')?.id ?? null);
        setState('challenge');
      } else setState('ok');
    })();
  }, []);

  if (state === 'ok') return <>{children}</>;
  if (state === 'checking') return null;
  const verify = async () => {
    if (!factorId) return;
    setError(null);
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (e) return setError(errorText(e));
    setState('ok');
  };
  return (
    <div className="card mx-auto max-w-sm animate-scale-in space-y-4" data-testid="mfa-gate">
      <div className="flex items-center gap-2">
        <LockIcon />
        <h1 className="text-lg font-bold">{t('security.challengeTitle')}</h1>
      </div>
      <p className="text-sm text-slate-500">{t('security.challengeText')}</p>
      <CodeInput value={code} onChange={setCode} />
      {error && <Banner tone="error">{error}</Banner>}
      <button type="button" className="btn-primary w-full" disabled={code.length !== 6} onClick={() => void verify()}>
        {t('security.verify')}
      </button>
    </div>
  );
}

export function TwoFactorSettings() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [verified, setVerified] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setVerified(data?.totp.find((f) => f.status === 'verified')?.id ?? null);
  };
  useEffect(() => {
    let alive = true;
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      if (alive) setVerified(data?.totp.find((f) => f.status === 'verified')?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const start = async () => {
    setMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `totp-${Date.now()}` });
    if (error) return setMsg({ tone: 'error', text: errorText(error) });
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };
  const confirm = async () => {
    if (!enrolling) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code });
    if (error) return setMsg({ tone: 'error', text: errorText(error) });
    setEnrolling(null);
    setCode('');
    setMsg({ tone: 'success', text: t('security.enabled') });
    void load();
  };
  const disable = async () => {
    if (!verified || !window.confirm(t('security.disableConfirm'))) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified });
    if (error) return setMsg({ tone: 'error', text: errorText(error) });
    setMsg({ tone: 'success', text: t('security.disabled') });
    void load();
  };

  return (
    <section className="card space-y-3" aria-labelledby="sec2fa">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sec2fa" className="flex items-center gap-2 font-semibold">
          <LockIcon width={18} height={18} /> {t('security.title')}
        </h2>
        <span className={`chip ${verified ? 'bg-emerald-100! text-emerald-800!' : ''}`}>
          {verified ? t('security.on') : t('security.off')}
        </span>
      </div>
      <p className="text-sm text-slate-500">{t('security.text')}</p>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      {enrolling ? (
        <div className="animate-fade-up space-y-3">
          <p className="text-sm">{t('security.scan')}</p>
          <img src={enrolling.qr} alt="TOTP QR" width={180} height={180} className="rounded-xl bg-white p-2" />
          <p className="break-all font-mono text-xs text-slate-500">{enrolling.secret}</p>
          <CodeInput value={code} onChange={setCode} />
          <button type="button" className="btn-primary" disabled={code.length !== 6} onClick={() => void confirm()}>
            {t('security.verify')}
          </button>
        </div>
      ) : verified ? (
        <button type="button" className="btn-secondary" onClick={() => void disable()}>
          {t('security.disable')}
        </button>
      ) : (
        <button type="button" className="btn-primary" onClick={() => void start()}>
          {t('security.enable')}
        </button>
      )}
    </section>
  );
}
