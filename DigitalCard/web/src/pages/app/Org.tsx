import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { displayName, formatMnt, TEMPLATES, type Organization } from '@digitalcard/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCardStats, useInvalidate } from '@/lib/queries';
import { createInvoice, type Invoice } from '@/lib/payments';
import { prepareImage } from '@/lib/image';
import { formatDate, rangeStart } from '@/lib/dates';
import { Icon } from '@/components/icons';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field, Spinner } from '@/components/ui';
import { PayModal } from '@/components/PayModal';
import { Funnel, sumStats } from './Stats';

const EDITABLE_FIELDS = [
  'title',
  'phone',
  'email',
  'avatar_path',
  'bio',
  'slogan',
  'address',
  'website',
  'links',
] as const;

function CreateOrg() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const { session, refresh } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="card space-y-3 bg-gradient-to-br from-brand-600 to-violet-600 text-white">
        <h2 className="text-xl font-bold">{t('org.introTitle')}</h2>
        <p className="text-white/85">{t('org.introBody')}</p>
        <ul className="space-y-2">
          {(['b1', 'b2', 'b3', 'b4'] as const).map((k) => (
            <li key={k} className="flex items-start gap-2">
              <Icon name="check" width={18} height={18} className="mt-0.5 shrink-0" />
              <span>{t(`org.benefit.${k}`)}</span>
            </li>
          ))}
        </ul>
        <ol className="grid gap-2 pt-2 sm:grid-cols-3">
          {(['s1', 's2', 's3'] as const).map((k, i) => (
            <li key={k} className="rounded-xl bg-white/10 p-3 text-sm">
              <span className="mb-1 block text-xs font-bold text-white/70">{i + 1}</span>
              {t(`org.step.${k}`)}
            </li>
          ))}
        </ol>
      </section>
      <div className="card space-y-4 self-start">
        <h1 className="text-2xl font-bold">{t('org.create')}</h1>
        <Field label={t('org.name')} htmlFor="org-name">
          <input id="org-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {error && <Banner tone="error">{error}</Banner>}
        <button
          type="button"
          className="btn-primary"
          disabled={!name.trim()}
          onClick={async () => {
            const { error: e } = await supabase
              .from('organizations')
              .insert({ name: name.trim(), owner_id: session!.user.id });
            if (e) setError(errorText(e));
            else refresh();
          }}
        >
          {t('org.create')}
        </button>
      </div>
    </div>
  );
}

export default function Org() {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const { session, entitlements, refresh } = useAuth();
  const invalidate = useInvalidate();
  const adminOrg = entitlements?.orgs.find((o) => o.status === 'active' && (o.role === 'owner' || o.role === 'admin'));
  const orgId = adminOrg?.org_id;
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [seats, setSeats] = useState(5);
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<Pick<
    Organization,
    'name' | 'brand_color' | 'locked_template_id' | 'allow_employee_edit_fields' | 'logo_path'
  > | null>(null);

  const org = useQuery({
    queryKey: ['org', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId!).single();
      if (error) throw error;
      return data;
    },
  });
  const sub = useQuery({
    queryKey: ['subscription', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from('subscriptions').select('*').eq('org_id', orgId!).maybeSingle();
      return data;
    },
  });
  const members = useQuery({
    queryKey: ['members', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_org_members', { p_org_id: orgId! });
      if (error) throw error;
      return data ?? [];
    },
  });
  const orgCards = useQuery({
    queryKey: ['orgcards', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('id, owner_id, first_name, last_name, name_format, slug')
        .eq('org_id', orgId!)
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
  });
  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: async () => (await supabase.from('plans').select('*')).data ?? [],
  });
  const stats = useCardStats(
    (orgCards.data ?? []).map((c) => c.id),
    rangeStart('30d'),
  );

  useEffect(() => {
    if (org.data)
      setForm({
        name: org.data.name,
        brand_color: org.data.brand_color,
        locked_template_id: org.data.locked_template_id,
        allow_employee_edit_fields: org.data.allow_employee_edit_fields,
        logo_path: org.data.logo_path,
      });
  }, [org.data]);

  useEffect(() => {
    if (sub.data?.seats) setSeats(Math.max(sub.data.seats, members.data?.length ?? 0));
  }, [sub.data, members.data]);

  const team = plans.data?.find((p) => p.id === 'team');
  const statsByCard = useMemo(() => new Map((stats.data ?? []).map((s) => [s.card_id, s])), [stats.data]);

  if (!entitlements) return <Spinner />;
  if (!adminOrg) {
    if (entitlements.orgs.length === 0) return <CreateOrg />;
    return <Banner tone="info">{t('org.notAdmin')}</Banner>;
  }
  if (org.isLoading || !form) return <Spinner />;

  const active =
    !!sub.data &&
    sub.data.status === 'active' &&
    !!sub.data.current_period_end &&
    sub.data.current_period_end > new Date().toISOString();
  const paidSeats = active ? sub.data!.seats : 0;
  const used = members.data?.length ?? 0;

  const saveSettings = async () => {
    const { error } = await supabase.from('organizations').update(form).eq('id', orgId!);
    setMsg(error ? { tone: 'error', text: errorText(error) } : { tone: 'success', text: t('editor.saved') });
    invalidate('org');
    refresh();
  };

  const invite = async () => {
    setMsg(null);
    const { data, error } = await supabase.functions.invoke('org-invite', {
      body: { org_id: orgId, email: inviteEmail.trim() },
    });
    if (error) {
      const body = await (error as { context?: Response }).context?.json().catch(() => null);
      return setMsg({ tone: 'error', text: errorText(body ?? error) });
    }
    if (data) {
      setInviteEmail('');
      invalidate('members');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!window.confirm(t('contactsx.confirmDelete'))) return;
    const { error } = await supabase.from('org_members').delete().eq('id', memberId);
    if (error) setMsg({ tone: 'error', text: errorText(error) });
    invalidate('members');
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    const p = await prepareImage(file, 600);
    if (p.error !== undefined || !p.blob) return setMsg({ tone: 'error', text: t(p.error ?? 'errors.generic') });
    const path = `${session!.user.id}/org-${orgId}-${Date.now()}.webp`;
    const { error } = await supabase.storage.from('logos').upload(path, p.blob, { contentType: p.blob.type });
    if (error) return setMsg({ tone: 'error', text: errorText(error) });
    setForm((f) => (f ? { ...f, logo_path: path } : f));
  };

  const buySeats = async () => {
    try {
      setInvoice(await createInvoice({ plan_id: 'team', org_id: orgId, seats, period }));
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(e) });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{org.data!.name}</h1>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

      <section className="card space-y-3" aria-labelledby="seats">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="seats" className="font-semibold">
            {t('org.seats', { used, total: paidSeats })}
          </h2>
          {active && (
            <span className="text-sm text-slate-500">
              {t('billing.activeUntil', { date: formatDate(sub.data!.current_period_end, locale) })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('billing.seats')} htmlFor="seats-n">
            <input
              id="seats-n"
              type="number"
              min={team?.min_seats ?? 5}
              max={500}
              className="input !w-28"
              value={seats}
              onChange={(e) => setSeats(Math.max(team?.min_seats ?? 5, Number(e.target.value) || 0))}
            />
          </Field>
          <Field label={t('billingx.period')} htmlFor="period-n">
            <select
              id="period-n"
              className="input !w-auto"
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'month' | 'year')}
            >
              <option value="month">{t('billingx.month')}</option>
              <option value="year">{t('billingx.year')}</option>
            </select>
          </Field>
          <button type="button" className="btn-primary" onClick={() => void buySeats()}>
            {active ? t('billing.renew') : t('org.buySeats')} —{' '}
            {team
              ? formatMnt(
                  (period === 'year' ? team.price_per_seat_annual_mnt : team.price_per_seat_mnt) *
                    Math.max(seats, team.min_seats),
                  locale,
                )
              : ''}
            {period === 'year' ? t('billingx.perYear') : t('plans.perMonth')}
          </button>
        </div>
      </section>

      <section className="card space-y-4" aria-labelledby="members">
        <h2 id="members" className="font-semibold">
          {t('org.members')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            className="input max-w-xs"
            placeholder={t('org.inviteEmail')}
            aria-label={t('org.inviteEmail')}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={!inviteEmail.includes('@') || used >= paidSeats}
            onClick={() => void invite()}
          >
            {t('org.invite')}
          </button>
        </div>
        {used >= paidSeats && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{t('errors.seat_limit_reached')}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 pr-3">{t('authx.fullName')}</th>
                <th className="py-2 pr-3">{t('auth.email')}</th>
                <th className="py-2 pr-3">{t('contactsx.filterStatus')}</th>
                <th className="py-2 pr-3">{t('stats.totalOpens')} (30)</th>
                <th className="py-2 pr-3">{t('stats.exchanges')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(members.data ?? []).map((m) => {
                const card = orgCards.data?.find((c) => c.owner_id === m.user_id);
                const s = card ? statsByCard.get(card.id) : undefined;
                return (
                  <tr key={m.member_id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-3">
                      {m.full_name ?? '—'} <span className="chip ml-1">{t(`org.role.${m.role}`)}</span>
                    </td>
                    <td className="py-2 pr-3">{m.email}</td>
                    <td className="py-2 pr-3">
                      {m.status === 'active' ? t('org.statusActive') : t('org.statusInvited')}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{s?.total_opens ?? 0}</td>
                    <td className="py-2 pr-3 tabular-nums">{s?.exchanges ?? 0}</td>
                    <td className="py-2 text-right">
                      {m.role !== 'owner' && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm text-red-600 dark:text-red-400"
                          onClick={() => void removeMember(m.member_id)}
                        >
                          {t('org.remove')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-4" aria-labelledby="brand">
        <h2 id="brand" className="font-semibold">
          {t('card.design')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('org.name')} htmlFor="o-name">
            <input
              id="o-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label={t('org.brandColor')} htmlFor="o-color">
            <input
              id="o-color"
              type="color"
              className="input h-[46px] p-1"
              value={form.brand_color ?? '#1E40AF'}
              onChange={(e) => setForm({ ...form, brand_color: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label={t('org.lockedTemplate')} htmlFor="o-tpl">
            <select
              id="o-tpl"
              className="input"
              value={form.locked_template_id ?? ''}
              onChange={(e) => setForm({ ...form, locked_template_id: e.target.value || null })}
            >
              <option value="">{t('org.none')}</option>
              {TEMPLATES.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name[locale]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('editor.logo')} htmlFor="o-logo" hint="JPG, PNG, WEBP ≤ 2 MB">
          <input
            id="o-logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
            onChange={(e) => void uploadLogo(e.target.files?.[0])}
          />
        </Field>
        <fieldset>
          <legend className="label">{t('org.allowedFields')}</legend>
          <div className="flex flex-wrap gap-3">
            {EDITABLE_FIELDS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.allow_employee_edit_fields.includes(f)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      allow_employee_edit_fields: e.target.checked
                        ? [...form.allow_employee_edit_fields, f]
                        : form.allow_employee_edit_fields.filter((x) => x !== f),
                    })
                  }
                />
                {f === 'links' ? t('card.links') : f === 'avatar_path' ? t('editor.avatar') : t(`card.${f}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" className="btn-primary" onClick={() => void saveSettings()}>
          {t('common.save')}
        </button>
      </section>

      <section className="card" aria-labelledby="ts">
        <h2 id="ts" className="mb-3 font-semibold">
          {t('org.teamStats')} — {t('stats.range.30d')}
        </h2>
        <Funnel s={sumStats(stats.data ?? [])} />
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {(orgCards.data ?? []).map((c) => {
            const s = statsByCard.get(c.id);
            return (
              <li key={c.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <span>
                  {displayName({
                    firstName: c.first_name,
                    lastName: c.last_name,
                    nameFormat: c.name_format as 'initial' | 'full',
                  })}
                </span>
                <span className="tabular-nums text-slate-500">
                  {s?.total_opens ?? 0} / {s?.contact_saves ?? 0} / {s?.exchanges ?? 0} / {s?.followups ?? 0}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <PayModal
        invoice={invoice}
        onClose={() => {
          setInvoice(null);
          invalidate('subscription');
        }}
      />
    </div>
  );
}
