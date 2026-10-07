import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  annualSavingPercent,
  byPlanOrder,
  formatMnt,
  PLAN_COPY,
  planAmount,
  type BillingPeriod,
  type PlanId,
} from '@digitalcard/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { createInvoice, type Invoice } from '@/lib/payments';

const EbarimtQr = lazy(() => import('@/components/QrCode').then((m) => ({ default: m.QrCode })));
import { formatDate } from '@/lib/dates';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Spinner } from '@/components/ui';
import { CheckIcon } from '@/components/icons';
import { PayModal } from '@/components/PayModal';

export default function Billing() {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const { entitlements } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>('year');

  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error: e } = await supabase.from('plans').select('*').order('price_mnt');
      if (e) throw e;
      return data;
    },
  });
  const payments = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (e) throw e;
      return data;
    },
  });

  if (plans.isLoading || !entitlements) return <Spinner />;

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      setInvoice(await createInvoice({ plan_id: 'pro', period }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const current = entitlements.personal_plan_id;
  // Price of one unit (Pro: account, Team: seat) for the chosen period — amounts come from the plans table.
  const unitPrice = (p: NonNullable<typeof plans.data>[number], pp: BillingPeriod) =>
    p.id === 'team' ? (pp === 'year' ? p.price_per_seat_annual_mnt : p.price_per_seat_mnt) : planAmount(p, pp);
  const maxSaving = Math.max(
    0,
    ...(plans.data ?? []).map((p) =>
      p.id === 'team'
        ? annualSavingPercent(p.price_per_seat_mnt, p.price_per_seat_annual_mnt)
        : annualSavingPercent(p.price_mnt, p.price_annual_mnt),
    ),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.billing')}</h1>
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{t('plans.current')}</p>
          <p className="text-lg font-semibold">{t(`plans.${current}`)}</p>
          {current !== 'free' && entitlements.personal_period_end && (
            <p className="text-sm text-slate-500">
              {t('billing.activeUntil', { date: formatDate(entitlements.personal_period_end, locale) })}
            </p>
          )}
        </div>
      </div>
      {error && <Banner tone="error">{error}</Banner>}

      <section aria-labelledby="choose">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="choose" className="text-lg font-semibold">
            {t('billing.choose')}
          </h2>
          <div
            role="radiogroup"
            aria-label={t('billingx.period')}
            className="relative flex rounded-full bg-slate-100 p-1 dark:bg-slate-800"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-white shadow-soft transition-transform duration-base ease-out dark:bg-slate-900"
              style={{ transform: period === 'year' ? 'translateX(100%)' : 'none' }}
            />
            {(['month', 'year'] as const).map((pp) => (
              <button
                key={pp}
                type="button"
                role="radio"
                aria-checked={period === pp}
                data-testid={`period-${pp}`}
                onClick={() => setPeriod(pp)}
                className={`relative z-10 min-h-[36px] min-w-[120px] rounded-full px-4 text-sm font-semibold transition-colors ${period === pp ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}
              >
                {t(`billingx.${pp}`)}
                {pp === 'year' && maxSaving > 0 && (
                  <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    −{maxSaving}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...(plans.data ?? [])].sort(byPlanOrder).map((p) => (
            <div
              key={p.id}
              className={`card card-hover relative flex flex-col ${p.id === 'pro' ? 'ring-2 ring-brand-600' : ''} ${p.id === current ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}
            >
              {p.id === 'pro' && (
                <span className="absolute -top-3 left-4 rounded-full bg-linear-to-r from-brand-600 to-accent-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  {t('billingx.popular')}
                </span>
              )}
              <h3 className="text-lg font-semibold">
                {locale === 'mn' ? p.name_mn : p.name_en}
                {p.id === current && <span className="chip ml-2 align-middle">{t('plans.current')}</span>}
              </h3>
              <p className="mt-1 text-2xl font-extrabold tabular-nums" data-testid={`price-${p.id}`}>
                {formatMnt(unitPrice(p, p.id === 'free' ? 'month' : period), locale)}
                <span className="text-sm font-medium text-slate-500">
                  {p.id === 'free'
                    ? ''
                    : `${p.id === 'team' ? t('billingx.perSeatShort') : ''}${period === 'year' ? t('billingx.perYear') : t('plans.perMonth')}`}
                </span>
              </p>
              {period === 'year' && p.id !== 'free' && (
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {t('billingx.monthlyEquivalent', {
                    amount: formatMnt(Math.round(unitPrice(p, 'year') / 12), locale),
                  })}
                </p>
              )}
              <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                {PLAN_COPY[p.id as PlanId]?.featureKeys.map((k) => (
                  <li key={k} className="flex gap-2">
                    <CheckIcon width={16} height={16} className="mt-0.5 shrink-0 text-emerald-600" />
                    {t(k)}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                {p.id === 'pro' && (
                  <button
                    type="button"
                    className="btn-primary w-full"
                    disabled={busy}
                    onClick={() => void pay()}
                    data-testid="pay-pro"
                  >
                    {current === 'pro' ? t('billing.renew') : t('billing.pay')}
                  </button>
                )}
                {p.id === 'team' && (
                  <Link to="/app/org" className="btn-secondary w-full">
                    {t('billing.teamViaOrg')}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="hist">
        <h2 id="hist" className="mb-3 font-semibold">
          {t('billing.history')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 pr-4">{t('billing.date')}</th>
                <th className="py-2 pr-4">{t('dash.plan')}</th>
                <th className="py-2 pr-4">{t('billing.amount')}</th>
                <th className="py-2 pr-4">{t('billing.status')}</th>
                <th className="py-2">{t('ebarimt.title')}</th>
              </tr>
            </thead>
            <tbody>
              {(payments.data ?? []).map((p) => (
                <tr key={p.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-4">{formatDate(p.created_at, locale)}</td>
                  <td className="py-2 pr-4">
                    {t(`plans.${p.plan_id}`)}
                    {p.plan_id === 'team' ? ` ×${p.seats}` : ''}
                    {p.period === 'year' ? ` · ${t('billingx.year')}` : ''}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{formatMnt(p.amount_mnt, locale)}</td>
                  <td className="py-2 pr-4">{t(`billing.status${p.status[0]!.toUpperCase()}${p.status.slice(1)}`)}</td>
                  <td className="py-2">
                    <EbarimtCell status={p.ebarimt_status} qr={p.ebarimt_qr} id={p.ebarimt_id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <PayModal invoice={invoice} onClose={() => setInvoice(null)} />
    </div>
  );
}

/** e-barimt (VAT receipt) for a paid invoice: QR to scan with the e-barimt app (lottery / tax refund). */
function EbarimtCell({ status, qr, id }: { status: string; qr: string | null; id: string | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (status === 'none') return <span className="text-slate-500">—</span>;
  if (status !== 'issued' || !qr) return <span className="text-slate-500">{t('ebarimt.preparing')}</span>;
  return (
    <div>
      <button
        type="button"
        className="btn-ghost btn-sm"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="ebarimt-toggle"
      >
        {t('ebarimt.show')}
      </button>
      {open && (
        <div className="mt-2 inline-block rounded-xl bg-white p-2" data-testid="ebarimt-qr">
          <Suspense fallback={<div className="h-[140px] w-[140px]" />}>
            <EbarimtQr value={qr} size={140} title={t('ebarimt.title')} />
          </Suspense>
          {id && <p className="mt-1 max-w-[140px] truncate text-xs text-slate-600">{id}</p>}
        </div>
      )}
    </div>
  );
}
