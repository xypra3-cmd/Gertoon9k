import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatMnt } from '@digitalcard/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/dates';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field, Spinner, Tabs } from '@/components/ui';

/** Admin access requires an aal2 session (TOTP). The database enforces the same rule. */
function MfaGate({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp.find((f) => f.status === 'verified');
      if (verified) return setFactorId(verified.id);
      const { data: en, error: e } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `admin-${Date.now()}`,
      });
      if (e) return setError(errorText(e));
      setFactorId(en.id);
      setQr(en.totp.qr_code);
    })();
  }, [errorText]);

  const verify = async () => {
    if (!factorId) return;
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (e) return setError(errorText(e));
    onDone();
  };

  return (
    <div className="card mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">{t('admin.mfaTitle')}</h1>
      {qr && (
        <>
          <p className="text-sm">{t('admin.mfaEnroll')}</p>
          <img src={qr} alt="TOTP QR" width={200} height={200} className="mx-auto rounded-xl bg-white p-2" />
        </>
      )}
      <Field label={t('admin.mfaVerify')} htmlFor="totp">
        <input
          id="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="input text-center text-xl tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </Field>
      {error && <Banner tone="error">{error}</Banner>}
      <button type="button" className="btn-primary w-full" disabled={code.length !== 6} onClick={() => void verify()}>
        {t('admin.verify')}
      </button>
    </div>
  );
}

type Tab = 'users' | 'orgs' | 'subs' | 'payments' | 'audit';

function useAdminTable(tab: Tab, search: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', tab, search],
    enabled,
    queryFn: async () => {
      const q = (() => {
        switch (tab) {
          case 'users':
            return supabase.rpc('admin_list_users', { p_search: search || undefined });
          case 'orgs':
            return supabase
              .from('organizations')
              .select('id, name, owner_id, created_at')
              .order('created_at', { ascending: false })
              .limit(200);
          case 'subs':
            return supabase
              .from('subscriptions')
              .select('id, owner_user_id, org_id, plan_id, seats, status, current_period_end')
              .order('created_at', { ascending: false })
              .limit(200);
          case 'payments':
            return supabase
              .from('payments')
              .select('id, sender_invoice_no, plan_id, amount_mnt, paid_amount_mnt, status, failure_reason, created_at')
              .order('created_at', { ascending: false })
              .limit(200);
          case 'audit':
            return supabase
              .from('audit_log')
              .select('id, actor_id, action, entity, entity_id, meta, created_at')
              .order('created_at', { ascending: false })
              .limit(200);
        }
      })();
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });
}

export default function Admin() {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const { session, entitlements } = useAuth();
  const [aal, setAal] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('users');
  const [search, setSearch] = useState('');

  useEffect(() => {
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => setAal(data?.currentLevel ?? 'aal1'));
  }, [session]);

  const ready = !!entitlements?.is_admin && aal === 'aal2';
  const table = useAdminTable(tab, search, ready);

  if (!entitlements || aal === null) return <Spinner />;
  if (!entitlements.is_admin) return <Banner tone="error">{t('admin.forbidden')}</Banner>;
  if (aal !== 'aal2') return <MfaGate onDone={() => void supabase.auth.refreshSession().then(() => setAal('aal2'))} />;

  const rows = table.data ?? [];
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  const fmt = (k: string, v: unknown) => {
    if (v === null || v === undefined) return '—';
    if (/(_at|_end)$/.test(k) && typeof v === 'string') return formatDate(v, locale);
    if (/amount/.test(k) && typeof v === 'number') return formatMnt(v, locale);
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
      <Tabs
        value={tab}
        onChange={setTab}
        label={t('admin.title')}
        items={[
          { id: 'users', label: t('admin.users') },
          { id: 'orgs', label: t('admin.orgs') },
          { id: 'subs', label: t('admin.subs') },
          { id: 'payments', label: t('admin.payments') },
          { id: 'audit', label: t('admin.audit') },
        ]}
      />
      {tab === 'users' && (
        <input
          className="input max-w-sm"
          type="search"
          placeholder={t('common.search')}
          aria-label={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      {table.error && <Banner tone="error">{errorText(table.error)}</Banner>}
      {table.isLoading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={`border-t border-slate-200 dark:border-slate-800 ${r.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                >
                  {cols.map((c) => (
                    <td key={c} className="max-w-[260px] truncate px-3 py-2" title={fmt(c, r[c])}>
                      {fmt(c, r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
