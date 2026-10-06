import { lazy, Suspense, useCallback, useState } from 'react';
import { isStrongPassword } from '@digitalcard/shared/validation';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field } from '@/components/ui';
import { AuthCard } from './Login';
import { captureReferral, storedReferral } from '@/lib/growth';
import { env } from '@/lib/env';

const Turnstile = lazy(() => import('@/components/Turnstile').then((m) => ({ default: m.Turnstile })));

const schema = z.object({
  full_name: z.string().trim().min(1, 'errors.required').max(120),
  email: z.string().trim().email('errors.invalidEmail'),
  password: z.string().refine(isStrongPassword, 'authx.passwordMin'),
  accept: z.literal(true, { errorMap: () => ({ message: 'errors.consentRequired' }) }),
});
type V = z.infer<typeof schema>;

export default function Register() {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const { session } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const plan = params.get('plan');
  captureReferral(`?${params.toString()}`);
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const onToken = useCallback((tok: string | null) => setCaptcha(tok), []);
  const { register, handleSubmit, formState } = useForm<V>({ resolver: zodResolver(schema) });

  if (session) return <Navigate to="/app" replace />;

  const onSubmit = async (v: V) => {
    setError(null);
    if (env.authCaptcha && !captcha) return setError(t('errors.captcha_failed'));
    const { data, error: err } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        data: { full_name: v.full_name, locale, ref: storedReferral() ?? undefined },
        emailRedirectTo: `${window.location.origin}/app`,
        captchaToken: captcha ?? undefined,
      },
    });
    if (err) return setError(errorText(err));
    if (!data.session) return setError(t('authx.checkEmail'));
    nav(plan === 'pro' ? '/app/billing' : plan === 'team' ? '/app/org' : '/app/welcome', { replace: true });
  };

  const e = (k: keyof V) => (formState.errors[k]?.message ? t(String(formState.errors[k]?.message)) : undefined);

  return (
    <AuthCard title={t('auth.register')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label={t('authx.fullName')} error={e('full_name')} htmlFor="full_name">
          <input id="full_name" autoComplete="name" className="input" {...register('full_name')} />
        </Field>
        <Field label={t('auth.email')} error={e('email')} htmlFor="email">
          <input id="email" type="email" autoComplete="email" className="input" {...register('email')} />
        </Field>
        <Field label={t('auth.password')} error={e('password')} htmlFor="password">
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="input"
            {...register('password')}
          />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5" {...register('accept')} />
          <span>
            <Link to="/legal/terms" target="_blank" className="text-brand-600 underline">
              {t('landing.terms')}
            </Link>{' '}
            ·{' '}
            <Link to="/legal/privacy" target="_blank" className="text-brand-600 underline">
              {t('landing.privacy')}
            </Link>
            <br />
            {t('auth.acceptTerms')}
          </span>
        </label>
        {e('accept') && <p className="field-error">{e('accept')}</p>}
        {env.authCaptcha && (
          <Suspense fallback={null}>
            <Turnstile onToken={onToken} locale={locale} />
          </Suspense>
        )}
        {error && <Banner tone="error">{error}</Banner>}
        <button type="submit" className="btn-primary w-full" disabled={formState.isSubmitting}>
          {t('auth.register')}
        </button>
      </form>
      <p className="mt-4 text-sm">
        {t('authx.haveAccount')}{' '}
        <Link to="/login" className="text-brand-600 hover:underline">
          {t('auth.login')}
        </Link>
      </p>
    </AuthCard>
  );
}
