import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { exchangeSchema, type ExchangeInput } from '@digitalcard/shared';
import { useI18n } from '@/i18n/I18nProvider';
import { submitExchange } from '@/lib/publicApi';
import { Turnstile } from './Turnstile';
import { Banner, Field } from './ui';

type FormValues = Omit<ExchangeInput, 'consent'> & { consent: boolean };

export default function ExchangeForm({ slug, onDone }: { slug: string; onDone: (ownerName: string) => void }) {
  const { t, locale } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(exchangeSchema) as never,
    defaultValues: { name: '', phone: '', email: '', company: '', title: '', message: '', consent: false },
  });
  const onToken = useCallback((tk: string | null) => setToken(tk), []);

  const onSubmit = async (v: FormValues) => {
    setServerError(null);
    if (!token) {
      setServerError(t('errors.captcha_failed'));
      return;
    }
    const res = await submitExchange({ slug, ...v, consent: v.consent === true, turnstile_token: token });
    if (res.status === 'ok') {
      onDone(res.owner_first_name ?? '');
      return;
    }
    setServerError(
      t(`errors.${res.status}`) === `errors.${res.status}` ? t('errors.generic') : t(`errors.${res.status}`),
    );
  };

  const err = (k: keyof FormValues) => (errors[k]?.message ? t(String(errors[k]?.message)) : undefined);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <Field label={`${t('exchange.name')} *`} error={err('name')} htmlFor="ex-name">
        <input id="ex-name" className="input" autoComplete="name" {...register('name')} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('exchange.phone')} error={err('phone')} htmlFor="ex-phone">
          <input id="ex-phone" className="input" type="tel" autoComplete="tel" inputMode="tel" {...register('phone')} />
        </Field>
        <Field label={t('exchange.email')} error={err('email')} htmlFor="ex-email">
          <input id="ex-email" className="input" type="email" autoComplete="email" {...register('email')} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('exchange.company')} htmlFor="ex-company">
          <input id="ex-company" className="input" autoComplete="organization" {...register('company')} />
        </Field>
        <Field label={t('exchange.jobTitle')} htmlFor="ex-title">
          <input id="ex-title" className="input" autoComplete="organization-title" {...register('title')} />
        </Field>
      </div>
      <Field label={t('exchange.message')} error={err('message')} htmlFor="ex-msg">
        <textarea id="ex-msg" className="input" rows={3} maxLength={300} {...register('message')} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" {...register('consent')} />
        <span>{t('exchange.consent')} *</span>
      </label>
      {errors.consent && <p className="field-error">{t('errors.consentRequired')}</p>}
      <Turnstile onToken={onToken} locale={locale} />
      {serverError && <Banner tone="error">{serverError}</Banner>}
      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {t('exchange.submit')}
      </button>
    </form>
  );
}
