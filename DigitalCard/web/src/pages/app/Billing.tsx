import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatMnt, PLAN_COPY, type PlanId } from '@digitalcard/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { createInvoice, type Invoice } from '@/lib/payments';
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
      setInvoice(await createInvoice({ plan_id: 'pro' }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const current = entitlements.personal_plan_id;

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
        <h2 id="choose" className="mb-3 text-lg font-semibold">
          {t('billing.choose')}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(plans.data ?? []).map((p) => (
            <div key={p.id} className={`card flex flex-col ${p.id === current ? 'ring-2 ring-brand-600' : ''}`}>
              <h3 className="text-lg font-semibold">{locale === 'mn' ? p.name_mn : p.name_en}</h3>
              <p className="mt-1 text-2xl font-extrabold">
                {formatMnt(p.id === 'team' ? p.price_per_seat_mnt : p.price_mnt, locale)}
                <span className="text-sm font-medium text-slate-500">
                  {p.id === 'team' ? t('plans.perSeat') : p.id === 'free' ? '' : t('plans.perMonth')}
                </span>
              </p>
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
                <th className="py-2">{t('billing.status')}</th>
              </tr>
            </thead>
            <tbody>
              {(payments.data ?? []).map((p) => (
                <tr key={p.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-4">{formatDate(p.created_at, locale)}</td>
                  <td className="py-2 pr-4">
                    {t(`plans.${p.plan_id}`)}
                    {p.plan_id === 'team' ? ` ×${p.seats}` : ''}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{formatMnt(p.amount_mnt, locale)}</td>
                  <td className="py-2">{t(`billing.status${p.status[0]!.toUpperCase()}${p.status.slice(1)}`)}</td>
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
