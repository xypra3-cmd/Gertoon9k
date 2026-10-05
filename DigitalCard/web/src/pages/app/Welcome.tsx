// First-run wizard: about you → pick a design (live preview) → publish. A shareable card in ~60 seconds.
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { generateSlug, TEMPLATES, type TemplateId } from '@digitalcard/shared';
import { useAuth } from '@/lib/auth';
import { useInvalidate, useMyCards } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { fromCard } from '@/lib/cardData';
import { publicCardUrl } from '@/lib/env';
import { runAi } from '@/lib/ai';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { CardRenderer } from '@/templates';
import { QrCode } from '@/components/QrCode';
import { Banner, Field, Spinner } from '@/components/ui';
import { ArrowRightIcon, CheckIcon, CopyIcon, SparklesIcon } from '@/components/icons';
import { Celebrate } from '@/components/growth';

type Step = 0 | 1 | 2;

export default function Welcome() {
  const { t, locale } = useI18n();
  const errorText = useErrorText();
  const { session, profile, refresh } = useAuth();
  const cards = useMyCards();
  const invalidate = useInvalidate();
  const [step, setStep] = useState<Step>(0);
  const fullDefault = profile?.full_name?.trim() ?? '';
  const [lastName, setLastName] = useState(() => (fullDefault.split(/\s+/).length > 1 ? fullDefault.split(/\s+/)[0]! : ''));
  const [firstName, setFirstName] = useState(() => fullDefault.split(/\s+/).slice(-1)[0] ?? '');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [template, setTemplate] = useState<TemplateId>('modern');
  const [scheme, setScheme] = useState<'a' | 'b'>('a');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; slug: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [slug] = useState(() => generateSlug(fullDefault || session?.user.email?.split('@')[0] || 'card'));

  const preview = useMemo(
    () =>
      fromCard({
        slug,
        template_id: template,
        color_scheme: scheme,
        first_name: firstName || t('welcome.sampleFirst'),
        last_name: lastName || null,
        name_format: 'full',
        title: title || t('welcome.sampleTitle'),
        company: company || null,
        phone: phone || null,
        email: session?.user.email ?? null,
        website: null,
        address: null,
        bio: bio || null,
        slogan: null,
        avatar_path: null,
        logo_path: null,
      }),
    [slug, template, scheme, firstName, lastName, title, company, phone, bio, session, t],
  );

  if (cards.isLoading) return <Spinner />;
  if (!created && (cards.data ?? []).length > 0) return <Navigate to="/app" replace />;

  const aiBio = async () => {
    setBusy(true);
    setError(null);
    try {
      const { result } = await runAi('bio', { name: `${lastName} ${firstName}`.trim(), title, company, keywords: bio }, locale);
      setBio(result.bio.slice(0, 500));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('cards')
      .insert({
        owner_id: session!.user.id,
        slug,
        template_id: template,
        color_scheme: scheme,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        name_format: 'full',
        title: title.trim() || null,
        company: company.trim() || null,
        phone: phone.trim() || null,
        email: session!.user.email ?? null,
        bio: bio.trim() || null,
        is_published: true,
      })
      .select('id, slug')
      .single();
    setBusy(false);
    if (err) return setError(errorText(err));
    await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', session!.user.id);
    setCreated(data);
    invalidate('cards', 'growth');
    refresh();
  };

  const steps = [t('welcome.step1'), t('welcome.step2'), t('welcome.step3')];

  if (created) {
    const url = publicCardUrl(created.slug);
    return (
      <div className="mx-auto max-w-lg space-y-6 py-6" data-testid="welcome-done">
        <Celebrate title={t('welcome.doneTitle')} body={t('welcome.doneBody')} />
        <div className="card animate-scale-in flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-white p-3 shadow-soft">
            <QrCode value={publicCardUrl(created.slug, 'qr')} size={200} title={`QR: ${url}`} />
          </div>
          <p className="break-all text-center text-sm text-slate-500">{url}</p>
          <div className="flex w-full flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                void navigator.clipboard.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                })
              }
            >
              {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
              {copied ? t('common.copied') : t('common.copyLink')}
            </button>
            <a href={url} target="_blank" rel="noreferrer" className="btn-secondary">
              {t('dash.view')}
            </a>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to={`/app/cards/${created.id}`} className="btn-secondary">
            {t('welcome.addPhoto')}
          </Link>
          <Link to="/app" className="btn-ghost">
            {t('welcome.toDashboard')} <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      </div>
    );
  }

  const canNext = step === 0 ? firstName.trim().length > 0 : true;

  return (
    <div className="space-y-6" data-testid="welcome">
      <div>
        <p className="text-sm font-semibold text-brand-600">{t('welcome.kicker')}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">
          <span className="gradient-text">{t('welcome.title')}</span>
        </h1>
      </div>

      <ol className="flex items-center gap-2" aria-label={t('welcome.progress')}>
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors duration-base ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'
              }`}
              aria-current={i === step ? 'step' : undefined}
            >
              {i < step ? <CheckIcon width={16} height={16} /> : i + 1}
            </span>
            <span className={`hidden text-sm sm:inline ${i === step ? 'font-semibold' : 'text-slate-500'}`}>{label}</span>
            {i < steps.length - 1 && (
              <span className="h-0.5 flex-1 overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
                <span
                  className="block h-full bg-emerald-500 transition-[width] duration-slow ease-out"
                  style={{ width: i < step ? '100%' : '0%' }}
                />
              </span>
            )}
          </li>
        ))}
      </ol>

      {error && <Banner tone="error">{error}</Banner>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div key={step} className="card animate-fade-up space-y-4">
          {step === 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('card.lastName')} htmlFor="w-last">
                  <input id="w-last" className="input" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </Field>
                <Field label={`${t('card.firstName')} *`} htmlFor="w-first">
                  <input id="w-first" className="input" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('card.title')} htmlFor="w-title">
                  <input id="w-title" className="input" autoComplete="organization-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label={t('card.company')} htmlFor="w-company">
                  <input id="w-company" className="input" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} />
                </Field>
              </div>
              <Field label={t('card.phone')} htmlFor="w-phone">
                <input id="w-phone" className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label={t('card.bio')} htmlFor="w-bio" hint={t('welcome.bioHint')}>
                <textarea id="w-bio" className="input" rows={3} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} />
              </Field>
              <button type="button" className="btn-ai btn-sm" disabled={busy || !firstName.trim()} onClick={() => void aiBio()}>
                <SparklesIcon width={14} height={14} className={busy ? 'animate-spin' : ''} />
                {busy ? t('ai.working') : t('ai.writeBio')}
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TEMPLATES.map((tpl, i) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplate(tpl.id as TemplateId)}
                    aria-pressed={template === tpl.id}
                    style={{ animationDelay: `${i * 35}ms` }}
                    className={`animate-fade-up rounded-xl border-2 p-2 text-left text-sm transition duration-fast ease-out hover:-translate-y-0.5 ${
                      template === tpl.id ? 'border-brand-600 shadow-soft' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="mb-2 flex h-10 overflow-hidden rounded-lg">
                      <span className="flex-1" style={{ background: tpl.colors.a.bg }} />
                      <span className="w-3" style={{ background: tpl.colors.a.accent }} />
                      <span className="flex-1" style={{ background: tpl.colors.b.bg }} />
                      <span className="w-3" style={{ background: tpl.colors.b.accent }} />
                    </div>
                    {tpl.name[locale]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(['a', 'b'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={scheme === s}
                    onClick={() => setScheme(s)}
                    className={`btn-sm btn ${scheme === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'btn-secondary'}`}
                  >
                    {t('welcome.scheme', { n: s === 'a' ? 1 : 2 })}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t('welcome.readyTitle')}</h2>
              <ul className="space-y-2 text-sm">
                {(['ready1', 'ready2', 'ready3'] as const).map((k) => (
                  <li key={k} className="flex gap-2">
                    <CheckIcon width={18} height={18} className="shrink-0 text-emerald-600" /> {t(`welcome.${k}`)}
                  </li>
                ))}
              </ul>
              <p className="break-all rounded-xl bg-slate-100 px-3 py-2 font-mono text-xs dark:bg-slate-800">{publicCardUrl(slug)}</p>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => (s - 1) as Step)}>
              {t('welcome.back')}
            </button>
            {step < 2 ? (
              <button type="button" className="btn-primary" disabled={!canNext} onClick={() => setStep((s) => (s + 1) as Step)} data-testid="welcome-next">
                {t('welcome.next')} <ArrowRightIcon width={16} height={16} />
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={busy || !firstName.trim()} onClick={() => void publish()} data-testid="welcome-publish">
                {t('welcome.publish')}
              </button>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200/60 p-4 dark:from-slate-900 dark:to-slate-800/60" aria-label={t('editor.preview')}>
            <div key={`${template}-${scheme}`} className="animate-scale-in">
              <CardRenderer data={preview} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
