import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  buildIcs,
  buildVCard,
  CONTACT_STATUSES,
  contactSchema,
  MET_WHERE_TYPES,
  VCARD_MIME,
  type Contact,
  type ContactStatus,
} from '@digitalcard/shared';
import { useAuth } from '@/lib/auth';
import { useContacts, useCreateContact, useDeleteContact, useUpdateContact } from '@/lib/queries';
import { addDays, formatDate, ubToday } from '@/lib/dates';
import { downloadText, toCsv } from '@/lib/download';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { Banner, Field, Modal, Spinner } from '@/components/ui';
import { CalendarIcon, CameraIcon, CopyIcon, Icon, LockIcon, SparklesIcon } from '@/components/icons';
import { chartColors } from '@digitalcard/shared/design';
import { imageToBase64, runAi, type AiResults } from '@/lib/ai';

type FuFilter = '' | 'today' | 'overdue' | 'upcoming' | 'none';

const contactVcf = (c: Contact) =>
  buildVCard({
    firstName: c.name,
    lastName: null,
    nameFormat: 'full',
    title: c.title,
    company: c.company,
    phone: c.phone,
    email: c.email,
    website: c.website?.startsWith('https://') ? c.website : null,
    address: null,
    bio: c.note,
    links: [],
  });

function ContactForm({ contact, onDone }: { contact: Contact | null; onDone: (id?: string) => void }) {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const { session, entitlements, refresh, profile } = useAuth();
  const crm = !!entitlements?.crm_enabled;
  const update = useUpdateContact();
  const create = useCreateContact();
  const del = useDeleteContact();
  const today = ubToday();
  const empty = {
    name: '',
    title: '',
    company: '',
    phone: '',
    email: '',
    website: '',
    met_at: null,
    met_where_type: null,
    met_where_text: '',
    note: '',
    tags: [] as string[],
    status: 'new' as ContactStatus,
    follow_up_at: null,
  };
  const [v, setV] = useState<Record<string, unknown>>(empty);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ai, setAi] = useState<'' | 'scan' | 'note' | 'followup'>('');
  const [noteAi, setNoteAi] = useState<AiResults['note'] | null>(null);
  const [draftMsg, setDraftMsg] = useState<AiResults['followup'] | null>(null);
  const [channel, setChannel] = useState<'email' | 'sms'>('email');

  const scanCard = async (file: File | undefined) => {
    if (!file) return;
    setAi('scan');
    setError(null);
    try {
      const img = await imageToBase64(file);
      const { result } = await runAi('scan', { image_base64: img.data, media_type: img.mediaType }, locale);
      setV((o) => ({
        ...o,
        name: [result.last_name, result.first_name].filter(Boolean).join(' ') || o.name,
        title: result.title || o.title,
        company: result.company || o.company,
        phone: result.phone || o.phone,
        email: result.email || o.email,
        website: result.website || o.website,
      }));
      setOk(t('ai.scanReady'));
      refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setAi('');
    }
  };

  const summarize = async () => {
    setAi('note');
    setError(null);
    try {
      const { result } = await runAi('note', { note: s('note'), name: s('name'), company: s('company') }, locale);
      setNoteAi(result);
      refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setAi('');
    }
  };

  const applyNoteAi = () => {
    if (!noteAi) return;
    const merged = [...new Set([...tags, ...noteAi.tags.map((x) => x.slice(0, 30))])].slice(0, 20);
    const days = Math.min(60, Math.max(1, Math.round(noteAi.follow_up_days || 3)));
    setV((o) => ({
      ...o,
      tags: merged,
      follow_up_at: addDays(today, days),
      status: o.status === 'new' ? 'follow_up' : o.status,
      note: `${(o.note as string) || ''}\n— ${noteAi.summary}\n→ ${noteAi.next_step}`.trim(),
    }));
    setNoteAi(null);
  };

  const draftFollowup = async () => {
    setAi('followup');
    setError(null);
    try {
      const { result } = await runAi(
        'followup',
        { name: s('name'), company: s('company'), note: s('note'), channel, sender: profile?.full_name ?? '' },
        locale,
      );
      setDraftMsg(result);
      refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setAi('');
    }
  };

  useEffect(() => {
    setV(contact ? { ...contact } : { ...empty, met_at: crm ? today : null });
    setError(null);
    setOk(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  const s = (k: string) => (v[k] as string | null) ?? '';
  const set = (k: string, val: unknown) => setV((o) => ({ ...o, [k]: val }));

  const save = async () => {
    setError(null);
    setOk(null);
    const parsed = contactSchema.safeParse({
      ...v,
      met_at: v.met_at || null,
      follow_up_at: v.follow_up_at || null,
      met_where_type: v.met_where_type || null,
    });
    if (!parsed.success) return setError(t(parsed.error.issues[0]!.message));
    const d = parsed.data;
    const basic = {
      name: d.name,
      title: d.title ?? null,
      company: d.company ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      website: d.website ?? null,
    };
    const crmPart = crm
      ? {
          met_at: d.met_at ?? null,
          met_where_type: d.met_where_type ?? null,
          met_where_text: d.met_where_text ?? null,
          note: d.note ?? null,
          tags: d.tags,
          status: d.status,
          follow_up_at: d.follow_up_at ?? null,
        }
      : {};
    try {
      if (contact) {
        await update.mutateAsync({ id: contact.id, patch: { ...basic, ...crmPart } });
        setOk(t('editor.saved'));
      } else {
        const row = await create.mutateAsync({ owner_id: session!.user.id, source: 'manual', ...basic, ...crmPart });
        onDone(row.id);
      }
    } catch (e) {
      setError(errorText(e));
    }
  };

  const quick = async (patch: Partial<Contact>) => {
    if (!contact) return set('follow_up_at', patch.follow_up_at ?? null);
    try {
      await update.mutateAsync({ id: contact.id, patch });
      setV((o) => ({ ...o, ...patch }));
    } catch (e) {
      setError(errorText(e));
    }
  };

  const tags = (v.tags as string[]) ?? [];
  const crmDisabled = !crm;

  return (
    <div className="space-y-4">
      {!contact && (
        <label
          className={`btn-ai w-full cursor-pointer ${ai === 'scan' ? 'pointer-events-none opacity-70' : ''}`}
          data-testid="ai-scan"
        >
          {ai === 'scan' ? (
            <SparklesIcon width={16} height={16} className="animate-spin" />
          ) : (
            <CameraIcon width={16} height={16} />
          )}
          {ai === 'scan' ? t('ai.scanning') : t('ai.scanCard')}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={(e) => void scanCard(e.target.files?.[0])}
          />
        </label>
      )}
      {contact && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip">{t(`contacts.source.${contact.source}`)}</span>
          <span className="chip">{formatDate(contact.created_at, locale)}</span>
          {contact.consent_at && <span className="chip">✓ consent</span>}
        </div>
      )}
      {contact?.exchange_message && (
        <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
          <p className="text-xs font-semibold text-slate-500">{t('contactsx.message')}</p>
          <p className="whitespace-pre-line">{contact.exchange_message}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t('exchange.name')} *`} htmlFor="c-name">
          <input id="c-name" className="input" value={s('name')} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label={t('card.company')} htmlFor="c-company">
          <input
            id="c-company"
            className="input"
            value={s('company')}
            onChange={(e) => set('company', e.target.value)}
          />
        </Field>
        <Field label={t('card.title')} htmlFor="c-title">
          <input id="c-title" className="input" value={s('title')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label={t('card.phone')} htmlFor="c-phone">
          <input
            id="c-phone"
            type="tel"
            className="input"
            value={s('phone')}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
        <Field label={t('card.email')} htmlFor="c-email">
          <input
            id="c-email"
            type="email"
            className="input"
            value={s('email')}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field label={t('card.website')} htmlFor="c-web">
          <input id="c-web" className="input" value={s('website')} onChange={(e) => set('website', e.target.value)} />
        </Field>
      </div>

      <fieldset
        className={`space-y-3 rounded-2xl border p-4 ${crmDisabled ? 'border-dashed border-slate-300 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800'}`}
        disabled={crmDisabled}
        data-testid="crm-fields"
      >
        <legend className="px-1 text-sm font-semibold">CRM</legend>
        {crmDisabled && (
          <Banner
            tone="info"
            action={
              <Link to="/app/billing" className="btn-primary btn-sm">
                {t('plans.upgrade')}
              </Link>
            }
          >
            <span className="inline-flex items-center gap-1">
              <LockIcon width={14} height={14} /> {t('contacts.crmLocked')}
            </span>
          </Banner>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('contacts.metAt')} htmlFor="c-met">
            <input
              id="c-met"
              type="date"
              className="input"
              value={s('met_at')}
              onChange={(e) => set('met_at', e.target.value || null)}
            />
          </Field>
          <Field label={t('contactsx.metWhereText')} htmlFor="c-wt">
            <select
              id="c-wt"
              className="input"
              value={s('met_where_type')}
              onChange={(e) => set('met_where_type', e.target.value || null)}
            >
              <option value="">—</option>
              {MET_WHERE_TYPES.map((m) => (
                <option key={m} value={m}>
                  {t(`contacts.metWhere.${m}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="&nbsp;" htmlFor="c-wtext">
            <input
              id="c-wtext"
              className="input"
              aria-label={t('contactsx.metWhereText')}
              value={s('met_where_text')}
              onChange={(e) => set('met_where_text', e.target.value)}
            />
          </Field>
        </div>
        <Field label={t('contacts.note')} htmlFor="c-note">
          <textarea
            id="c-note"
            rows={4}
            className="input"
            value={s('note')}
            onChange={(e) => set('note', e.target.value)}
          />
        </Field>
        {crm && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ai btn-sm"
              disabled={!!ai || !s('note').trim()}
              onClick={() => void summarize()}
              data-testid="ai-note"
            >
              <SparklesIcon width={14} height={14} className={ai === 'note' ? 'animate-spin' : ''} />
              {ai === 'note' ? t('ai.working') : t('ai.summarize')}
            </button>
            {contact && (
              <span className="inline-flex items-center gap-1">
                <select
                  className="input !min-h-[36px] !w-auto !py-1 text-xs"
                  aria-label={t('ai.channel')}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as 'email' | 'sms')}
                >
                  <option value="email">{t('card.email')}</option>
                  <option value="sms">SMS / chat</option>
                </select>
                <button
                  type="button"
                  className="btn-ai btn-sm"
                  disabled={!!ai}
                  onClick={() => void draftFollowup()}
                  data-testid="ai-followup"
                >
                  <SparklesIcon width={14} height={14} className={ai === 'followup' ? 'animate-spin' : ''} />
                  {ai === 'followup' ? t('ai.working') : t('ai.draftFollowup')}
                </button>
              </span>
            )}
          </div>
        )}
        {noteAi && (
          <div
            className="animate-scale-in space-y-2 rounded-xl border border-accent-500/30 bg-violet-50/60 p-3 text-sm dark:bg-violet-900/10"
            data-testid="ai-note-result"
          >
            <p>
              <strong>{t('ai.summary')}:</strong> {noteAi.summary}
            </p>
            <p>
              <strong>{t('ai.nextStep')}:</strong> {noteAi.next_step} · {t('ai.inDays', { n: noteAi.follow_up_days })}
            </p>
            <div className="flex flex-wrap gap-1">
              {noteAi.tags.map((x) => (
                <span key={x} className="chip">
                  {x}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary btn-sm" onClick={applyNoteAi}>
                {t('ai.apply')}
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setNoteAi(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
        {draftMsg && (
          <div
            className="animate-scale-in space-y-2 rounded-xl border border-accent-500/30 bg-violet-50/60 p-3 text-sm dark:bg-violet-900/10"
            data-testid="ai-followup-result"
          >
            {draftMsg.subject && (
              <p>
                <strong>{draftMsg.subject}</strong>
              </p>
            )}
            <p className="whitespace-pre-line">{draftMsg.message}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() =>
                  void navigator.clipboard.writeText(draftMsg.message).then(() => setOk(t('common.copied')))
                }
              >
                <CopyIcon width={14} height={14} /> {t('ai.copy')}
              </button>
              {channel === 'email' && s('email') && (
                <a
                  className="btn-primary btn-sm"
                  href={`mailto:${s('email')}?subject=${encodeURIComponent(draftMsg.subject)}&body=${encodeURIComponent(draftMsg.message)}`}
                >
                  {t('ai.openMail')}
                </a>
              )}
              {channel === 'sms' && s('phone') && (
                <a
                  className="btn-primary btn-sm"
                  href={`sms:${s('phone')}?&body=${encodeURIComponent(draftMsg.message)}`}
                >
                  {t('ai.openSms')}
                </a>
              )}
              <button type="button" className="btn-ghost btn-sm" onClick={() => setDraftMsg(null)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
        <Field label={t('contacts.tags')} htmlFor="c-tag">
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tg) => (
              <button
                key={tg}
                type="button"
                className="chip"
                onClick={() =>
                  set(
                    'tags',
                    tags.filter((x) => x !== tg),
                  )
                }
                aria-label={`${t('editor.remove')} ${tg}`}
              >
                {tg} ✕
              </button>
            ))}
            <input
              id="c-tag"
              className="input !w-40"
              placeholder={t('contactsx.addTag')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault();
                  if (!tags.includes(tagInput.trim())) set('tags', [...tags, tagInput.trim().slice(0, 30)]);
                  setTagInput('');
                }
              }}
            />
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('contactsx.filterStatus')} htmlFor="c-status">
            <select id="c-status" className="input" value={s('status')} onChange={(e) => set('status', e.target.value)}>
              {CONTACT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t(`contacts.status.${st}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('contacts.followUp')} htmlFor="c-fu">
            <input
              id="c-fu"
              type="date"
              className="input"
              value={s('follow_up_at')}
              onChange={(e) => set('follow_up_at', e.target.value || null)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {[3, 7, 14].map((n) => (
            <button
              key={n}
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void quick({ follow_up_at: addDays(today, n), status: 'follow_up' })}
            >
              {t('contactsx.plusDays', { n })}
            </button>
          ))}
          {contact && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => void quick({ last_contacted_at: new Date().toISOString(), follow_up_at: null })}
            >
              {t('contacts.contacted')}
            </button>
          )}
        </div>
        {contact?.last_contacted_at && (
          <p className="text-xs text-slate-500">
            {t('contactsx.lastContacted')}: {formatDate(contact.last_contacted_at, locale)}
          </p>
        )}
      </fieldset>

      {error && <Banner tone="error">{error}</Banner>}
      {ok && <Banner tone="success">{ok}</Banner>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => void save()}
          disabled={update.isPending || create.isPending}
        >
          {t('common.save')}
        </button>
        {contact && (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                downloadText(contactVcf(contact), `${contact.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.vcf`, VCARD_MIME)
              }
            >
              .vcf
            </button>
            <button
              type="button"
              className="btn-ghost text-red-600"
              onClick={async () => {
                if (!window.confirm(t('contactsx.confirmDelete'))) return;
                await del.mutateAsync(contact.id);
                onDone();
              }}
            >
              {t('common.delete')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Initials bubble; colour is stable per name so people are easy to spot in a long list. */
function ContactAvatar({ name }: { name: string }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = (words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? '?').slice(0, 2)).toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: chartColors[h % chartColors.length] }}
    >
      {letters}
    </span>
  );
}

export default function Contacts() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, locale } = useI18n();
  const { entitlements } = useAuth();
  const contacts = useContacts();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [fu, setFu] = useState<FuFilter>('');
  const [creating, setCreating] = useState(false);
  const today = ubToday();

  const all = useMemo(() => contacts.data ?? [], [contacts.data]);
  const tags = useMemo(() => [...new Set(all.flatMap((c) => c.tags))].sort(), [all]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((c) => {
      if (
        needle &&
        ![c.name, c.company, c.title, c.phone, c.email, c.note].some((f) => f?.toLowerCase().includes(needle))
      )
        return false;
      if (tag && !c.tags.includes(tag)) return false;
      if (status && c.status !== status) return false;
      if (source && c.source !== source) return false;
      if (fu === 'today' && c.follow_up_at !== today) return false;
      if (fu === 'overdue' && !(c.follow_up_at && c.follow_up_at < today)) return false;
      if (fu === 'upcoming' && !(c.follow_up_at && c.follow_up_at > today)) return false;
      if (fu === 'none' && c.follow_up_at) return false;
      return true;
    });
  }, [all, q, tag, status, source, fu, today]);

  const selected = id ? (all.find((c) => c.id === id) ?? null) : null;
  if (contacts.isLoading || !entitlements) return <Spinner />;

  const exportCsv = () =>
    downloadText(
      toCsv(filtered as unknown as Record<string, unknown>[], [
        'name',
        'title',
        'company',
        'phone',
        'email',
        'website',
        'source',
        'met_at',
        'met_where_type',
        'met_where_text',
        'note',
        'tags',
        'status',
        'follow_up_at',
        'last_contacted_at',
        'created_at',
      ]),
      `contacts-${today}.csv`,
      'text/csv;charset=utf-8',
    );
  const exportVcf = () => downloadText(filtered.map(contactVcf).join(''), `contacts-${today}.vcf`, VCARD_MIME);
  const exportIcs = () =>
    downloadText(
      buildIcs(
        all
          .filter((c) => c.follow_up_at && c.status !== 'closed')
          .map((c) => ({
            uid: c.id,
            title: `Follow-up: ${c.name}${c.company ? `, ${c.company}` : ''}`,
            description: [c.phone, c.email, c.note].filter(Boolean).join('\n'),
            date: c.follow_up_at!,
          })),
      ),
      `followups-${today}.ics`,
      'text/calendar;charset=utf-8',
    );

  const list = (
    <div className="space-y-3">
      <input
        className="input"
        type="search"
        placeholder={t('common.search')}
        aria-label={t('common.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="input"
          aria-label={t('contactsx.filterTag')}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">{t('contactsx.filterTag')}</option>
          {tags.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          className="input"
          aria-label={t('contactsx.filterStatus')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t('contactsx.filterStatus')}</option>
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`contacts.status.${s}`)}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label={t('contactsx.filterSource')}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">{t('contactsx.filterSource')}</option>
          {(['exchange', 'nearby', 'qr', 'manual'] as const).map((s) => (
            <option key={s} value={s}>
              {t(`contacts.source.${s}`)}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label={t('contactsx.filterFollowup')}
          value={fu}
          onChange={(e) => setFu(e.target.value as FuFilter)}
        >
          <option value="">{t('contactsx.filterFollowup')}</option>
          <option value="today">{t('contactsx.fuToday')}</option>
          <option value="overdue">{t('contactsx.fuOverdue')}</option>
          <option value="upcoming">{t('contactsx.fuUpcoming')}</option>
          <option value="none">{t('contactsx.fuNone')}</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-slate-500">{t('contactsx.empty')}</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to={`/app/contacts/${c.id}`}
                className={`flex items-center justify-between gap-2 rounded-lg px-2 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 ${c.id === id ? 'bg-brand-50 dark:bg-brand-700/20' : ''}`}
              >
                <ContactAvatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-slate-500">{[c.company, c.title].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                  <span className="chip">{t(`contacts.status.${c.status}`)}</span>
                  {c.follow_up_at && (
                    <span className={c.follow_up_at < today ? 'text-red-600' : 'text-slate-500'}>
                      {formatDate(c.follow_up_at, locale)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {t('contacts.title')}
          {entitlements.contact_limit !== null && (
            <span className="chip ml-2 align-middle">
              {t('contactsx.limit', { count: entitlements.contact_count, limit: entitlements.contact_limit })}
            </span>
          )}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={exportCsv}>
            {t('common.export')} {t('contactsx.exportCsv')}
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={exportVcf}>
            {t('common.export')} {t('contactsx.exportVcf')}
          </button>
          {entitlements.crm_enabled && (
            <button type="button" className="btn-secondary btn-sm" onClick={exportIcs} data-testid="export-ics">
              <CalendarIcon width={14} height={14} /> {t('ai.exportIcs')}
            </button>
          )}
          <button type="button" className="btn-primary btn-sm" onClick={() => setCreating(true)}>
            + {t('contactsx.new')}
          </button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className={`card ${selected ? 'hidden lg:block' : ''}`}>{list}</div>
        {selected ? (
          <div className="card">
            <Link to="/app/contacts" className="btn-ghost btn-sm mb-2 lg:hidden">
              ← {t('common.back')}
            </Link>
            <ContactForm contact={selected} onDone={() => nav('/app/contacts')} />
          </div>
        ) : (
          <div className="card hidden flex-col items-center justify-center gap-4 text-center lg:flex">
            <span className="rounded-2xl bg-brand-50 p-4 text-brand-600 dark:bg-brand-700/20 dark:text-brand-200">
              <Icon name="users" width={32} height={32} />
            </span>
            <p className="text-lg font-semibold">{t('contactsx.pickTitle')}</p>
            <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{t('contactsx.pickBody')}</p>
            <dl className="grid w-full max-w-sm grid-cols-3 gap-2">
              {[
                [t('contactsx.statTotal'), all.length],
                [
                  t('contactsx.statDue'),
                  all.filter((c) => c.follow_up_at && c.follow_up_at <= today && c.status !== 'closed').length,
                ],
                [t('contactsx.statNew'), all.filter((c) => c.status === 'new').length],
              ].map(([label, n]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <dd className="text-2xl font-bold tabular-nums">{n}</dd>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title={t('contactsx.new')}>
        {creating && (
          <ContactForm
            contact={null}
            onDone={(newId) => {
              setCreating(false);
              if (newId) nav(`/app/contacts/${newId}`);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
