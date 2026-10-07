import { useMemo, useState } from 'react';
import { WalletButton } from '@/components/WalletButton';
import { Link, useNavigate } from 'react-router-dom';
import { displayName, generateSlug, type Contact } from '@digitalcard/shared';
import { useAuth } from '@/lib/auth';
import { useContacts, useInvalidate, useMyCards, useUpdateContact } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { addDays, daysBetween, formatDate, ubToday } from '@/lib/dates';
import { publicCardUrl } from '@/lib/env';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Spinner } from '@/components/ui';
import { LockIcon, SparklesIcon } from '@/components/icons';
import { EmailSignatureButton, GettingStarted, InviteCard } from '@/components/growth';
import { EventMode } from '@/components/EventMode';
import { useGrowth } from '@/lib/growth';

function FollowupRow({ c, today }: { c: Contact; today: string }) {
  const { t } = useI18n();
  const update = useUpdateContact();
  const overdue = c.follow_up_at! < today;
  const metDays = c.met_at ? daysBetween(c.met_at, today) : null;
  const place = c.met_where_text || (c.met_where_type ? t(`contacts.metWhere.${c.met_where_type}`) : '');
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <Link to={`/app/contacts/${c.id}`} className="font-semibold hover:underline">
          {c.name}
        </Link>
        {c.company && <span className="text-slate-500"> · {c.company}</span>}
        <div className="text-sm text-slate-500">
          {[place, metDays !== null ? t('contacts.daysAgo', { n: metDays }) : null].filter(Boolean).join(', ')}
          {overdue && (
            <span className="ml-2 chip bg-red-100! text-red-700! dark:bg-red-500/15! dark:text-red-300!">
              {t('contacts.overdue')}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={update.isPending}
          onClick={() =>
            update.mutate({ id: c.id, patch: { last_contacted_at: new Date().toISOString(), follow_up_at: null } })
          }
        >
          {t('contacts.contacted')}
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={update.isPending}
          onClick={() => update.mutate({ id: c.id, patch: { follow_up_at: addDays(today, 3) } })}
        >
          {t('contacts.postpone')}
        </button>
      </div>
    </li>
  );
}

export default function Dashboard() {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const nav = useNavigate();
  const { session, profile, entitlements, refresh } = useAuth();
  const cards = useMyCards();
  const contacts = useContacts();
  const growth = useGrowth();
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = ubToday();

  const followups = useMemo(
    () =>
      (contacts.data ?? [])
        .filter((c) => c.follow_up_at && c.follow_up_at <= today && c.status !== 'closed')
        .sort((a, b) => (a.follow_up_at! < b.follow_up_at! ? -1 : 1)),
    [contacts.data, today],
  );
  const recentExchanges = useMemo(
    () =>
      (contacts.data ?? [])
        .filter((c) => c.source === 'exchange' && daysBetween(c.created_at.slice(0, 10), today) <= 7)
        .slice(0, 5),
    [contacts.data, today],
  );

  if (!entitlements || cards.isLoading) return <Spinner />;

  const uid = session!.user.id;
  const personalCards = (cards.data ?? []).filter((c) => c.org_id === null && c.owner_id === uid);
  const orgCards = (cards.data ?? []).filter((c) => c.org_id !== null);
  const quotaFull = entitlements.personal_card_count >= entitlements.card_quota;
  const editable = new Set(entitlements.editable_card_ids);
  const pendingInvites = entitlements.orgs.filter((o) => o.status === 'invited');
  const memberOrgsWithoutCard = entitlements.orgs.filter(
    (o) => o.status === 'active' && o.active && !orgCards.some((c) => c.org_id === o.org_id && c.owner_id === uid),
  );

  const createCard = async (orgId: string | null) => {
    setBusy(true);
    setError(null);
    const full = profile?.full_name?.trim() || session!.user.email!.split('@')[0]!;
    const [first, ...rest] = full.split(/\s+/).reverse();
    const { data, error: err } = await supabase
      .from('cards')
      .insert({
        owner_id: uid,
        org_id: orgId,
        slug: generateSlug(full),
        first_name: first ?? full,
        last_name: rest.reverse().join(' ') || null,
        email: session!.user.email,
      })
      .select('id')
      .single();
    setBusy(false);
    if (err) return setError(errorText(err));
    invalidate('cards');
    refresh();
    nav(`/app/cards/${data.id}`);
  };

  const acceptInvite = async (orgId: string) => {
    const { error: err } = await supabase.rpc('accept_org_invite', { p_org_id: orgId });
    if (err) setError(errorText(err));
    refresh();
  };

  const planName = t(`plans.${entitlements.personal_plan_id}`);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t('dash.hello', { name: profile?.full_name || session!.user.email || '' })}
      </h1>

      {error && <Banner tone="error">{error}</Banner>}
      {(cards.data ?? []).length === 0 && (
        <section className="card animate-fade-up relative overflow-hidden" data-testid="welcome-hero">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-linear-to-br from-brand-400/30 to-accent-500/30 blur-3xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{t('welcome.heroTitle')}</h2>
              <p className="text-slate-500">{t('welcome.heroBody')}</p>
            </div>
            <Link to="/app/welcome" className="btn-primary">
              <SparklesIcon width={16} height={16} /> {t('welcome.heroCta')}
            </Link>
          </div>
        </section>
      )}
      {growth.data && <GettingStarted growth={growth.data} firstCardId={cards.data?.[0]?.id ?? null} />}
      <EventMode crmEnabled={entitlements.crm_enabled} />
      {pendingInvites.map((o) => (
        <Banner
          key={o.org_id}
          tone="info"
          action={
            <button type="button" className="btn-primary btn-sm" onClick={() => void acceptInvite(o.org_id)}>
              {t('dash.accept')}
            </button>
          }
        >
          {t('dash.pendingInvite', { org: o.name })}
        </Banner>
      ))}
      {entitlements.personal_expired && !entitlements.has_active_plan && (
        <Banner
          tone="warn"
          action={
            <Link to="/app/billing" className="btn-primary btn-sm">
              {t('billing.renew')}
            </Link>
          }
        >
          {t('dash.expiredBanner')}
        </Banner>
      )}

      {entitlements.crm_enabled && (
        <section className="card" aria-labelledby="fu">
          <h2 id="fu" className="text-lg font-semibold">
            {t('contacts.todayFollowups')} / {t('contacts.overdue')}
          </h2>
          {followups.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t('dash.noFollowups')}</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800" data-testid="followups">
              {followups.map((c) => (
                <FollowupRow key={c.id} c={c} today={today} />
              ))}
            </ul>
          )}
        </section>
      )}

      {recentExchanges.length > 0 && (
        <section className="card" aria-labelledby="ex">
          <h2 id="ex" className="text-lg font-semibold">
            {t('dash.newExchanges')}
          </h2>
          <ul className="mt-2 space-y-2">
            {recentExchanges.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 text-sm">
                <Link to={`/app/contacts/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                  {c.company ? ` · ${c.company}` : ''}
                </Link>
                <span className="text-slate-500">{formatDate(c.created_at, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="cards">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="cards" className="text-lg font-semibold">
            {t('dash.myCards')}{' '}
            <span className="chip ml-1">
              {t('plans.quota', { used: entitlements.personal_card_count, limit: entitlements.card_quota })}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {memberOrgsWithoutCard.map((o) => (
              <button
                key={o.org_id}
                type="button"
                className="btn-secondary btn-sm"
                disabled={busy}
                onClick={() => void createCard(o.org_id)}
              >
                {t('dash.createOrgCard')}: {o.name}
              </button>
            ))}
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy || quotaFull}
              onClick={() => void createCard(null)}
              title={quotaFull ? t('errors.card_quota_exceeded') : undefined}
            >
              + {t('card.addCard')}
            </button>
          </div>
        </div>
        {quotaFull && entitlements.personal_plan_id === 'free' && (
          <div className="mb-3">
            <Banner
              tone="info"
              action={
                <Link to="/app/billing" className="btn-primary btn-sm">
                  {t('plans.upgrade')}
                </Link>
              }
            >
              {t('dash.upgradeBanner')}
            </Banner>
          </div>
        )}
        {(cards.data ?? []).length === 0 ? (
          <div className="card text-center">
            <p className="text-slate-500">{t('dash.noCards')}</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...personalCards, ...orgCards].map((c, i) => (
              <li
                key={c.id}
                style={{ animationDelay: `${i * 45}ms` }}
                className="card card-hover animate-fade-up flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {displayName({
                        firstName: c.first_name,
                        lastName: c.last_name,
                        nameFormat: c.name_format as 'initial' | 'full',
                      })}
                    </p>
                    <p className="truncate text-sm text-slate-500">{c.title}</p>
                  </div>
                  <span className={`chip ${c.is_published ? 'bg-emerald-100! text-emerald-800!' : ''}`}>
                    {c.is_published ? t('card.published') : t('card.draft')}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">/c/{c.slug}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link to={`/app/cards/${c.id}`} className="btn-secondary btn-sm">
                    {editable.has(c.id) ? (
                      t('common.edit')
                    ) : (
                      <>
                        <LockIcon width={14} height={14} /> {t('dash.locked')}
                      </>
                    )}
                  </Link>
                  <a href={publicCardUrl(c.slug)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                    {t('dash.view')}
                  </a>
                  <Link to={`/app/stats?card=${c.id}`} className="btn-ghost btn-sm">
                    {t('nav.stats')}
                  </Link>
                  {c.is_published && <EmailSignatureButton card={c} />}
                  {c.is_published && <WalletButton cardId={c.id} slug={c.slug} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {growth.data && <InviteCard growth={growth.data} />}

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{t('dash.plan')}</p>
          <p className="font-semibold">
            {planName}
            {entitlements.personal_period_end && entitlements.personal_plan_id !== 'free' && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                {t('dash.until', { date: formatDate(entitlements.personal_period_end, locale) })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/stats" className="btn-secondary btn-sm">
            {t('dash.funnel')}
          </Link>
          <Link to="/app/billing" className="btn-secondary btn-sm">
            {t('nav.billing')}
          </Link>
          <Link to="/app/settings" className="btn-ghost btn-sm">
            {t('nav.settings')}
          </Link>
        </div>
      </section>
    </div>
  );
}
