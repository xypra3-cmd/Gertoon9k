import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatMnt } from '@digitalcard/shared';
import { supabase } from '@/lib/supabase';
import type { Invoice } from '@/lib/payments';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n/I18nProvider';
import { Banner, Modal } from './ui';
import { CheckIcon } from './icons';

/** Shows the QPay QR + bank deeplinks and polls payments.status every 3 s. */
export function PayModal({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    if (!invoice) return;
    setStatus('pending');
    const timer = setInterval(async () => {
      const { data } = await supabase.from('payments').select('status').eq('id', invoice.payment_id).single();
      if (data && data.status !== 'pending') {
        setStatus(data.status);
        clearInterval(timer);
        refresh();
        void qc.invalidateQueries({ queryKey: ['payments'] });
        void qc.invalidateQueries({ queryKey: ['subscription'] });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [invoice, refresh, qc]);

  return (
    <Modal open={!!invoice} onClose={onClose} title={t('billing.pay')}>
      {invoice && (
        <div className="space-y-4 text-center" data-testid="pay-modal">
          <p className="text-2xl font-bold">{formatMnt(invoice.amount_mnt, locale)}</p>
          {status === 'paid' ? (
            <div className="space-y-3" data-testid="pay-confirmed">
              <CheckIcon className="mx-auto h-12 w-12 text-emerald-600" width={48} height={48} />
              <p className="text-lg font-semibold">{t('billing.confirmed')}</p>
              <button type="button" className="btn-primary w-full" onClick={onClose}>
                {t('common.close')}
              </button>
            </div>
          ) : status === 'pending' ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('billing.scan')}</p>
              <img
                src={`data:image/png;base64,${invoice.qr_image}`}
                alt="QPay QR"
                width={240}
                height={240}
                className="mx-auto rounded-xl bg-white p-2"
              />
              {invoice.urls.length > 0 && (
                <>
                  <p className="text-sm font-medium">{t('billing.orBank')}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {invoice.urls.map((u) => (
                      <a
                        key={u.name}
                        href={u.link}
                        className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 p-2 text-[11px] dark:border-slate-700"
                      >
                        <img src={u.logo} alt="" width={36} height={36} className="rounded-lg" loading="lazy" />
                        <span className="line-clamp-2">{u.description || u.name}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              <p className="flex items-center justify-center gap-2 text-sm text-slate-500" role="status">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
                  aria-hidden="true"
                />
                {t('billing.waiting')}
              </p>
            </>
          ) : (
            <Banner tone="error">{t(`billing.status${status[0]!.toUpperCase()}${status.slice(1)}`)}</Banner>
          )}
        </div>
      )}
    </Modal>
  );
}
