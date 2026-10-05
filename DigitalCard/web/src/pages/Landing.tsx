import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  annualSavingPercent,
  byPlanOrder,
  formatMnt,
  PLAN_COPY,
  planMonthlyAmount,
  type PlanId,
} from '@digitalcard/shared';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchPlans } from '@/lib/publicApi';
import { env } from '@/lib/env';
import { CheckIcon, Icon } from '@/components/icons';
import { Reveal } from '@/components/motion';
import { captureReferral } from '@/lib/growth';
import type { IconName } from '@digitalcard/shared/icons';
import { CardRenderer } from '@/templates';
import type { CardData } from '@digitalcard/shared';

const SAMPLE: CardData = {
  slug: 'sample',
  templateId: 'modern',
  colorScheme: 'a',
  firstName: 'Сараа',
  lastName: 'Ганбаатар',
  nameFormat: 'initial',
  title: 'Даатгалын зөвлөх',
  company: 'Мандал Даатгал',
  phone: '+976 8800 1122',
  email: 'saraa@example.mn',
  website: null,
  address: null,
  bio: null,
  slogan: null,
  avatarUrl: null,
  logoUrl: null,
  brandColor: null,
  links: [
    { kind: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com' },
    { kind: 'facebook', label: 'Facebook', url: 'https://facebook.com' },
  ],
};

export default function Landing() {
  const { t, locale } = useI18n();
  const plans = useQuery({ queryKey: ['plans-public'], queryFn: fetchPlans });

  const loc = useLocation();
  useEffect(() => captureReferral(loc.search), [loc.search]);
  const icons: IconName[] = ['qr', 'send', 'users', 'calendar', 'sparkles', 'pen'];
  const features = [1, 2, 3, 4, 5, 6].map((i) => ({
    title: t(`landing.f${i}t`),
    text: t(`landing.f${i}d`),
    icon: icons[i - 1]!,
  }));
  const proPlan = plans.data?.find((p) => p.id === 'pro');
  const saving = proPlan ? annualSavingPercent(proPlan.price_mnt, proPlan.price_annual_mnt) : 0;
  const faqs = [1, 2, 3, 4].map((i) => ({ q: t(`landing.q${i}`), a: t(`landing.a${i}`) }));

  return (
    <div>
      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 -z-10 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-brand-400/25 via-accent-500/20 to-transparent blur-3xl"
        />
        <div className="animate-fade-up">
          <span className="chip !bg-brand-50 !text-brand-700 dark:!bg-brand-900/40 dark:!text-brand-200">
            ✦ {t('landing.badge')}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t('landing.heroTitle')} <span className="gradient-text">{t('landing.heroAccent')}</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 dark:text-slate-300">{t('landing.heroText')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary px-6">
              {t('landing.ctaStart')}
            </Link>
            <Link to="/login" className="btn-secondary px-6">
              {t('landing.ctaLogin')}
            </Link>
            {env.demoMode && (
              <Link to="/c/saraa-g" className="btn-ghost">
                {t('landing.ctaDemo')}
              </Link>
            )}
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none animate-scale-in [animation-delay:150ms]">
          <div className="motion-safe:animate-[float_6s_ease-in-out_infinite]">
            <CardRenderer data={SAMPLE} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="features">
        <h2 id="features" className="text-2xl font-bold">
          {t('landing.featuresTitle')}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} index={i} className="card card-hover">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 text-brand-700 dark:from-brand-900/40 dark:to-violet-900/30 dark:text-brand-200">
                <Icon name={f.icon} />
              </span>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="steps">
        <h2 id="steps" className="text-2xl font-bold">
          {t('landing.stepsTitle')}
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Reveal as="li" key={i} index={i} className="card flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                {i}
              </span>
              <span>{t(`landing.s${i}`)}</span>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="pricing">
        <h2 id="pricing" className="text-2xl font-bold">
          {t('landing.pricingTitle')}
        </h2>
        {saving > 0 && proPlan && (
          <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {t('landing.annualNote', { saving, amount: formatMnt(proPlan.price_annual_mnt, locale) })}
          </p>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[...(plans.data ?? [])].sort(byPlanOrder).map((p) => {
            const copy = PLAN_COPY[p.id as PlanId];
            const price = p.id === 'team' ? p.price_per_seat_mnt : planMonthlyAmount(p);
            return (
              <div key={p.id} className={`card flex flex-col ${copy?.highlight ? 'ring-2 ring-brand-600' : ''}`}>
                <h3 className="text-lg font-semibold">{locale === 'mn' ? p.name_mn : p.name_en}</h3>
                <p className="mt-2 text-3xl font-extrabold">
                  {formatMnt(price, locale)}
                  <span className="text-sm font-medium text-slate-500">
                    {p.id === 'team' ? t('plans.perSeat') : p.id === 'free' ? '' : t('plans.perMonth')}
                  </span>
                </p>
                {p.id === 'team' && <p className="text-sm text-slate-500">{t('plans.minSeats', { n: p.min_seats })}</p>}
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {copy?.featureKeys.map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <CheckIcon className="mt-0.5 shrink-0 text-emerald-600" width={16} height={16} />
                      {t(k)}
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.id === 'free' ? '/register' : '/register?plan=' + p.id}
                  className={`${copy?.highlight ? 'btn-primary' : 'btn-secondary'} mt-6`}
                >
                  {t('landing.ctaStart')}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold">
          {t('landing.faqTitle')}
        </h2>
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="card">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
