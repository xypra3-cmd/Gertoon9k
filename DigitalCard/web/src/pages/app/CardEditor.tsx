import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  cardSchema,
  LINK_KINDS,
  linkSchema,
  TEMPLATES,
  type Card,
  type CardLink,
  type TablesUpdate,
  type TemplateId,
} from '@digitalcard/shared';
import { useAuth } from '@/lib/auth';
import { useCard, useInvalidate } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { fromCard } from '@/lib/cardData';
import { prepareImage } from '@/lib/image';
import { publicCardUrl } from '@/lib/env';
import { downloadBlob } from '@/lib/download';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { CardRenderer } from '@/templates';
import { QrCode, qrPngDataUrl } from '@/components/QrCode';
import { Banner, Field, Spinner, Tabs } from '@/components/ui';
import { LockIcon, SparklesIcon } from '@/components/icons';
import { EmailSignatureButton } from '@/components/growth';
import { burstConfetti } from '@/components/motion';
import { runAi } from '@/lib/ai';

type Draft = Pick<
  Card,
  | 'slug'
  | 'template_id'
  | 'color_scheme'
  | 'first_name'
  | 'last_name'
  | 'name_format'
  | 'title'
  | 'company'
  | 'phone'
  | 'email'
  | 'website'
  | 'address'
  | 'bio'
  | 'slogan'
  | 'avatar_path'
  | 'logo_path'
  | 'is_published'
>;
type LinkDraft = { kind: CardLink['kind']; label: string | null; url: string; sort: number };
type Tab = 'template' | 'info' | 'links' | 'design' | 'qr';

const FIELDS: (keyof Draft)[] = [
  'slug',
  'template_id',
  'color_scheme',
  'first_name',
  'last_name',
  'name_format',
  'title',
  'company',
  'phone',
  'email',
  'website',
  'address',
  'bio',
  'slogan',
  'avatar_path',
  'logo_path',
  'is_published',
];

export default function CardEditor() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const nav = useNavigate();
  const { session, entitlements, refresh } = useAuth();
  const card = useCard(id);
  const invalidate = useInvalidate();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [tab, setTab] = useState<Tab>('info');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!card.data) return;
    const d = {} as Record<string, unknown>;
    FIELDS.forEach((f) => (d[f] = card.data[f]));
    setDraft(d as Draft);
    setLinks(
      card.data.card_links
        .map((l) => ({ kind: l.kind, label: l.label, url: l.url, sort: l.sort }))
        .sort((a, b) => a.sort - b.sort),
    );
  }, [card.data]);

  const org = card.data?.organizations ?? null;
  const preview = useMemo(() => (draft ? fromCard(draft, links, org) : null), [draft, links, org]);

  if (card.isLoading || !draft || !entitlements || !preview)
    return card.error ? <Banner tone="error">{errorText(card.error)}</Banner> : <Spinner />;
  const c = card.data!;

  const canEdit = entitlements.editable_card_ids.includes(c.id);
  const isOrgCard = !!c.org_id;
  const isOrgAdmin =
    isOrgCard &&
    entitlements.orgs.some(
      (o) => o.org_id === c.org_id && o.status === 'active' && (o.role === 'owner' || o.role === 'admin'),
    );
  const employeeOnly = isOrgCard && !isOrgAdmin;
  const allowed = new Set(org?.allow_employee_edit_fields ?? []);
  const fieldEnabled = (f: string) => canEdit && (!employeeOnly || allowed.has(f));
  const linksEnabled = fieldEnabled('links');

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const str = (k: keyof Draft) => (draft[k] as string | null) ?? '';

  const writeBio = async () => {
    setAiBusy(true);
    setMsg(null);
    try {
      const { result } = await runAi(
        'bio',
        {
          name: [draft.last_name, draft.first_name].filter(Boolean).join(' '),
          title: draft.title,
          company: draft.company,
          keywords: draft.bio,
        },
        locale,
      );
      set('bio', result.bio.slice(0, 500));
      if (!draft.slogan && fieldEnabled('slogan')) set('slogan', result.slogan.slice(0, 120));
      setMsg({ tone: 'success', text: t('ai.bioReady') });
      refresh();
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(e) });
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    setMsg(null);
    setFieldErrors({});
    const parsed = cardSchema.safeParse(draft);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = t(i.message)));
      setFieldErrors(fe);
      setMsg({ tone: 'error', text: t('errors.invalid') });
      return;
    }
    const badLink = links.findIndex((l) => !linkSchema.safeParse(l).success);
    if (badLink >= 0) {
      setTab('links');
      setFieldErrors({ [`link-${badLink}`]: t('errors.invalidUrl') });
      setMsg({ tone: 'error', text: t('errors.invalidUrl') });
      return;
    }
    // Only send changed fields (org employees may only change allowed columns).
    const patch: Record<string, unknown> = {};
    FIELDS.forEach((f) => {
      const nv = f in parsed.data ? (parsed.data as Record<string, unknown>)[f] : draft[f];
      if ((nv ?? null) !== (c[f] ?? null)) patch[f] = nv ?? null;
    });
    setSaving(true);
    try {
      if (Object.keys(patch).length) {
        const { error } = await supabase
          .from('cards')
          .update(patch as TablesUpdate<'cards'>)
          .eq('id', c.id);
        if (error) throw error;
      }
      const original = JSON.stringify(c.card_links.map((l) => [l.kind, l.label, l.url]).sort());
      const current = JSON.stringify(links.map((l) => [l.kind, l.label || null, l.url]).sort());
      if (linksEnabled && original !== current) {
        const del = await supabase.from('card_links').delete().eq('card_id', c.id);
        if (del.error) throw del.error;
        if (links.length) {
          const ins = await supabase.from('card_links').insert(
            links.map((l, i) => ({
              card_id: c.id,
              kind: l.kind,
              label: l.label || null,
              url: l.url.trim(),
              sort: i,
            })),
          );
          if (ins.error) throw ins.error;
        }
      }
      const firstPublish = draft.is_published && !c.published_at;
      setMsg({ tone: 'success', text: firstPublish ? t('ai.publishedFirst') : t('editor.saved') });
      if (firstPublish) burstConfetti();
      invalidate('card', 'cards', 'growth');
    } catch (e) {
      setMsg({ tone: 'error', text: errorText(e) });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (kind: 'avatar_path' | 'logo_path', file: File | undefined) => {
    if (!file) return;
    const prepared = await prepareImage(file, kind === 'avatar_path' ? 800 : 600);
    if (prepared.error !== undefined || !prepared.blob)
      return setMsg({ tone: 'error', text: t(prepared.error ?? 'errors.generic') });
    const bucket = kind === 'avatar_path' ? 'avatars' : 'logos';
    const path = `${session!.user.id}/${c.id}-${Date.now()}.${prepared.blob.type === 'image/webp' ? 'webp' : file.name.split('.').pop()?.toLowerCase() || 'jpg'}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, prepared.blob, { contentType: prepared.blob.type || file.type, upsert: false });
    if (error) return setMsg({ tone: 'error', text: errorText(error) });
    set(kind, path);
  };

  const remove = async () => {
    if (!window.confirm(t('editor.confirmDelete'))) return;
    const { error } = await supabase.from('cards').delete().eq('id', c.id);
    if (error) return setMsg({ tone: 'error', text: errorText(error) });
    invalidate('cards');
    refresh();
    nav('/app');
  };

  const downloadQrPng = async () => {
    const dataUrl = await qrPngDataUrl(publicCardUrl(draft.slug, 'qr'), 1200);
    downloadBlob(await (await fetch(dataUrl)).blob(), `${draft.slug}-qr.png`);
  };

  const tabs: { id: Tab; label: string }[] = [
    ...(employeeOnly ? [] : [{ id: 'template' as Tab, label: t('editor.tabTemplate') }]),
    { id: 'info', label: t('editor.tabInfo') },
    { id: 'links', label: t('editor.tabLinks') },
    { id: 'design', label: t('editor.tabDesign') },
    { id: 'qr', label: t('editor.tabQr') },
  ];

  const input = (
    k: keyof Draft,
    label: string,
    opts: { type?: string; textarea?: boolean; autoComplete?: string } = {},
  ) => (
    <Field
      label={label}
      error={fieldErrors[k]}
      htmlFor={`f-${k}`}
      hint={!fieldEnabled(k) && canEdit ? t('editor.orgLocked') : undefined}
    >
      {opts.textarea ? (
        <textarea
          id={`f-${k}`}
          className="input"
          rows={3}
          value={str(k)}
          disabled={!fieldEnabled(k)}
          onChange={(e) => set(k, e.target.value as never)}
        />
      ) : (
        <input
          id={`f-${k}`}
          className="input"
          type={opts.type ?? 'text'}
          autoComplete={opts.autoComplete}
          value={str(k)}
          disabled={!fieldEnabled(k)}
          onChange={(e) => set(k, e.target.value as never)}
        />
      )}
    </Field>
  );

  const editorPane = (
    <div className="space-y-4">
      <Tabs value={tab} onChange={setTab} items={tabs} label={t('card.design')} />
      {tab === 'template' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              disabled={!fieldEnabled('template_id')}
              onClick={() => set('template_id', tpl.id as TemplateId)}
              aria-pressed={draft.template_id === tpl.id}
              className={`rounded-xl border-2 p-2 text-left text-sm ${draft.template_id === tpl.id ? 'border-brand-600' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <div className="mb-2 flex h-12 overflow-hidden rounded-lg">
                <span className="flex-1" style={{ background: tpl.colors.a.bg }} />
                <span className="w-3" style={{ background: tpl.colors.a.accent }} />
                <span className="flex-1" style={{ background: tpl.colors.b.bg }} />
                <span className="w-3" style={{ background: tpl.colors.b.accent }} />
              </div>
              {tpl.name[locale]}
            </button>
          ))}
        </div>
      )}
      {tab === 'info' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {input('last_name', t('card.lastName'), { autoComplete: 'family-name' })}
            {input('first_name', `${t('card.firstName')} *`, { autoComplete: 'given-name' })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {input('title', t('card.title'))}
            {input('company', t('card.company'))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {input('phone', t('card.phone'), { type: 'tel' })}
            {input('email', t('card.email'), { type: 'email' })}
          </div>
          {input('website', t('card.website'), { type: 'url' })}
          {input('address', t('card.address'))}
          {input('slogan', t('card.slogan'))}
          {input('bio', t('card.bio'), { textarea: true })}
          {fieldEnabled('bio') && (
            <div className="-mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-ai btn-sm"
                disabled={aiBusy}
                onClick={() => void writeBio()}
                data-testid="ai-bio"
              >
                <SparklesIcon width={14} height={14} className={aiBusy ? 'animate-spin' : ''} />
                {aiBusy ? t('ai.working') : t('ai.writeBio')}
              </button>
              <span className="text-xs text-slate-500">{t('ai.reviewHint')}</span>
            </div>
          )}
          {c.published_at ? (
            <Field label={t('editor.slug')} htmlFor="f-slug" hint={t('ai.slugLockedHint')}>
              <div className="relative">
                <input id="f-slug" className="input pr-10" value={draft.slug} disabled readOnly />
                <LockIcon width={16} height={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>
          ) : (
            input('slug', t('editor.slug'))
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={draft.is_published}
              disabled={!fieldEnabled('is_published')}
              onChange={(e) => set('is_published', e.target.checked)}
            />
            {t('card.publish')}
          </label>
        </div>
      )}
      {tab === 'links' && (
        <div className="space-y-3">
          {!linksEnabled && canEdit && <Banner tone="info">{t('editor.orgLocked')}</Banner>}
          {links.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                <select
                  className="input"
                  aria-label={t('editor.label')}
                  value={l.kind}
                  disabled={!linksEnabled}
                  onChange={(e) =>
                    setLinks((ls) =>
                      ls.map((x, j) => (j === i ? { ...x, kind: e.target.value as CardLink['kind'] } : x)),
                    )
                  }
                >
                  {LINK_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  aria-label={t('editor.label')}
                  placeholder={t('editor.label')}
                  value={l.label ?? ''}
                  disabled={!linksEnabled}
                  onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className="input sm:col-span-2"
                  aria-label={t('editor.url')}
                  placeholder="https://"
                  value={l.url}
                  disabled={!linksEnabled}
                  onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                />
                {fieldErrors[`link-${i}`] && <p className="field-error sm:col-span-2">{fieldErrors[`link-${i}`]}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  aria-label="up"
                  disabled={!linksEnabled || i === 0}
                  onClick={() =>
                    setLinks((ls) => {
                      const n = [...ls];
                      [n[i - 1], n[i]] = [n[i]!, n[i - 1]!];
                      return n;
                    })
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  aria-label="down"
                  disabled={!linksEnabled || i === links.length - 1}
                  onClick={() =>
                    setLinks((ls) => {
                      const n = [...ls];
                      [n[i + 1], n[i]] = [n[i]!, n[i + 1]!];
                      return n;
                    })
                  }
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm text-red-600"
                  aria-label={t('editor.remove')}
                  disabled={!linksEnabled}
                  onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            disabled={!linksEnabled || links.length >= 20}
            onClick={() => setLinks((ls) => [...ls, { kind: 'website', label: '', url: 'https://', sort: ls.length }])}
          >
            + {t('editor.addLink')}
          </button>
        </div>
      )}
      {tab === 'design' && (
        <div className="space-y-4">
          <fieldset>
            <legend className="label">{t('card.design')}</legend>
            <div className="flex gap-2">
              {(['a', 'b'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={draft.color_scheme === s ? 'btn-primary' : 'btn-secondary'}
                  disabled={!fieldEnabled('color_scheme')}
                  onClick={() => set('color_scheme', s)}
                  aria-pressed={draft.color_scheme === s}
                >
                  {s === 'a' ? t('editor.colorA') : t('editor.colorB')}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">{t('card.nameFormat')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['initial', 'full'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={draft.name_format === f ? 'btn-primary' : 'btn-secondary'}
                  disabled={!fieldEnabled('name_format')}
                  onClick={() => set('name_format', f)}
                  aria-pressed={draft.name_format === f}
                >
                  {f === 'initial' ? t('card.nameInitial') : t('card.nameFull')}
                </button>
              ))}
            </div>
          </fieldset>
          {(['avatar_path', 'logo_path'] as const).map((k) =>
            k === 'logo_path' && isOrgCard ? null : (
              <Field
                key={k}
                label={k === 'avatar_path' ? t('editor.avatar') : t('editor.logo')}
                htmlFor={`up-${k}`}
                hint="JPG, PNG, WEBP ≤ 2 MB"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id={`up-${k}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={!fieldEnabled(k)}
                    onChange={(e) => void upload(k, e.target.files?.[0])}
                    className="text-sm"
                  />
                  {draft[k] && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={!fieldEnabled(k)}
                      onClick={() => set(k, null)}
                    >
                      {t('editor.remove')}
                    </button>
                  )}
                </div>
              </Field>
            ),
          )}
        </div>
      )}
      {tab === 'qr' && (
        <div className="space-y-4 text-center">
          <div className="inline-block rounded-2xl bg-white p-4">
            <QrCode value={publicCardUrl(draft.slug, 'qr')} size={240} title={`QR: ${publicCardUrl(draft.slug)}`} />
          </div>
          <p className="break-all text-sm text-slate-500">{publicCardUrl(draft.slug)}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => void downloadQrPng()}>
              {t('editor.downloadPng')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                void navigator.clipboard
                  .writeText(publicCardUrl(draft.slug))
                  .then(() => setMsg({ tone: 'success', text: t('common.copied') }))
              }
            >
              {t('common.copyLink')}
            </button>
            <Link to={`/app/cards/${c.id}/print`} className="btn-secondary">
              {t('editor.print')}
            </Link>
            <EmailSignatureButton card={{ ...c, ...draft }} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('common.edit')}</h1>
        <div className="flex flex-wrap gap-2">
          <a href={publicCardUrl(draft.slug)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
            {t('editor.openPublic')}
          </a>
          {(!isOrgCard || isOrgAdmin || c.owner_id === session?.user.id) && (
            <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => void remove()}>
              {t('editor.deleteCard')}
            </button>
          )}
          <button type="button" className="btn-primary" disabled={!canEdit || saving} onClick={() => void save()}>
            {t('common.save')}
          </button>
        </div>
      </div>
      {!canEdit && (
        <Banner
          tone="warn"
          action={
            !isOrgCard ? (
              <Link to="/app/billing" className="btn-primary btn-sm">
                {t('plans.upgrade')}
              </Link>
            ) : undefined
          }
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <LockIcon width={16} height={16} /> {t('editor.lockedTitle')}
          </span>{' '}
          {t('editor.lockedText')}
        </Banner>
      )}
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

      <div className="lg:hidden">
        <Tabs
          value={mobileView}
          onChange={setMobileView}
          items={[
            { id: 'edit', label: t('editor.edit') },
            { id: 'preview', label: t('editor.preview') },
          ]}
          label={t('editor.preview')}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`card ${mobileView === 'preview' ? 'hidden lg:block' : ''}`}>{editorPane}</div>
        <div className={`${mobileView === 'edit' ? 'hidden lg:block' : ''}`}>
          <div
            className="sticky top-20 rounded-3xl bg-slate-100 p-4 dark:bg-slate-900"
            aria-label={t('editor.preview')}
          >
            <CardRenderer data={preview} />
          </div>
        </div>
      </div>
    </div>
  );
}
