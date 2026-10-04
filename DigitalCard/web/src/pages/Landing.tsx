import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatMnt, PLAN_COPY, planMonthlyAmount, type PlanId } from '@digitalcard/shared';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchPlans } from '@/lib/publicApi';
import { env } from '@/lib/env';
import { CheckIcon } from '@/components/icons';
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

  const features = [1, 2, 3, 4].map((i) => ({ title: t(`landing.f${i}t`), text: t(`landing.f${i}d`) }));
  const faqs = [1, 2, 3, 4].map((i) => ({ q: t(`landing.q${i}`), a: t(`landing.a${i}`) }));

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t('landing.heroTitle')}</h1>
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
        <div aria-hidden="true" className="pointer-events-none">
          <CardRenderer data={SAMPLE} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="features">
        <h2 id="features" className="text-2xl font-bold">
          {t('landing.featuresTitle')}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="steps">
        <h2 id="steps" className="text-2xl font-bold">
          {t('landing.stepsTitle')}
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="card flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                {i}
              </span>
              <span>{t(`landing.s${i}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="pricing">
        <h2 id="pricing" className="text-2xl font-bold">
          {t('landing.pricingTitle')}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {(plans.data ?? []).map((p) => {
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
