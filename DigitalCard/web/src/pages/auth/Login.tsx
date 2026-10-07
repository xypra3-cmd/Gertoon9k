import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { safeNextPath } from '@digitalcard/shared/validation';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field } from '@/components/ui';
import { PasskeySignIn } from '@/components/Passkeys';

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

// Statically replaced by Vite → the whole demo block (accounts + password) is dead-code-eliminated in production builds.
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const DEMO_ACCOUNTS = DEMO
  ? ['basic@demo.mn', 'pro@demo.mn', 'org-owner@demo.mn', 'employee1@demo.mn', 'expired@demo.mn', 'admin@demo.mn']
  : [];
const DEMO_PASSWORD = DEMO ? 'Demo1234!' : '';

export default function Login() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const { session } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState } = useForm<{ email: string; password: string }>();

  if (session) return <Navigate to={next} replace />;

  const onSubmit = async (v: { email: string; password: string }) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: v.email.trim(), password: v.password });
    if (err) setError(errorText(err));
    else nav(next, { replace: true });
  };

  return (
    <AuthCard title={t('auth.login')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label={t('auth.email')} htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="username webauthn"
            required
            className="input"
            {...register('email', { required: true })}
          />
        </Field>
        <Field label={t('auth.password')} htmlFor="password">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            {...register('password', { required: true })}
          />
        </Field>
        {error && <Banner tone="error">{error}</Banner>}
        <button type="submit" className="btn-primary w-full" disabled={formState.isSubmitting}>
          {t('auth.login')}
        </button>
      </form>
      <div className="mt-4">
        <PasskeySignIn onSignedIn={() => nav(next, { replace: true })} />
      </div>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot" className="text-brand-600 hover:underline">
          {t('auth.forgot')}
        </Link>
        <Link to="/register" className="text-brand-600 hover:underline">
          {t('auth.register')}
        </Link>
      </div>
      {DEMO && (
        <div className="mt-6 rounded-xl border border-dashed border-amber-400 p-3 text-sm" data-testid="demo-accounts">
          <p className="mb-2 font-semibold">{t('authx.demoTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((email) => (
              <button
                key={email}
                type="button"
                className="chip"
                onClick={() => {
                  setValue('email', email);
                  setValue('password', DEMO_PASSWORD);
                }}
              >
                {email}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthCard>
  );
}
