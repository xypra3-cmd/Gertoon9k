// Dashboard growth widgets: getting-started checklist, invite-a-friend, e-mail signature.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { displayName, type Card } from '@digitalcard/shared';
import { inviteUrl, type Growth } from '@/lib/growth';
import { publicCardUrl } from '@/lib/env';
import { useI18n } from '@/i18n/I18nProvider';
import { Modal } from './ui';
import { CheckIcon, CopyIcon, GiftIcon, Icon, PenIcon, TrophyIcon } from './icons';
import { burstConfetti, ProgressRing } from './motion';

interface Step {
  id: string;
  done: boolean;
  to: string;
}

export function GettingStarted({ growth, firstCardId }: { growth: Growth; firstCardId: string | null }) {
  const { t } = useI18n();
  const editTo = firstCardId ? `/app/cards/${firstCardId}` : '/app/welcome';
  const steps: Step[] = useMemo(
    () => [
      { id: 'card', done: growth.has_card, to: '/app/welcome' },
      { id: 'photo', done: growth.has_photo, to: editTo },
      { id: 'links', done: growth.has_links, to: editTo },
      { id: 'publish', done: growth.has_published, to: editTo },
      { id: 'share', done: growth.has_shared, to: editTo },
      { id: 'contact', done: growth.has_contact, to: '/app/contacts' },
    ],
    [growth, editTo],
  );
  const done = steps.filter((s) => s.done).length;
  const all = done === steps.length;
  const celebrated = useRef(false);
  useEffect(() => {
    if (!all || celebrated.current) return;
    celebrated.current = true;
    try {
      if (localStorage.getItem('dc.celebrated') === '1') return;
      localStorage.setItem('dc.celebrated', '1');
    } catch {
      /* ignore */
    }
    burstConfetti();
  }, [all]);
  if (all) return null;
  const next = steps.find((s) => !s.done);

  return (
    <section className="card animate-fade-up overflow-hidden" aria-labelledby="gs" data-testid="getting-started">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <ProgressRing value={done / steps.length} label={t('growth.progress', { done, total: steps.length })} />
          <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">
            {done}/{steps.length}
          </span>
        </div>
        <div className="min-w-0">
          <h2 id="gs" className="text-lg font-semibold">
            {t('growth.title')}
          </h2>
          <p className="text-sm text-slate-500">{t('growth.subtitle')}</p>
        </div>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.id} style={{ animationDelay: `${i * 45}ms` }} className="animate-fade-up">
            <Link
              to={s.to}
              className={`group flex min-h-[48px] items-center gap-3 rounded-xl border px-3 py-2 text-sm transition duration-base ease-out ${
                s.done
                  ? 'border-transparent bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : s === next
                    ? 'border-brand-200 bg-brand-50/60 font-semibold text-brand-700 hover:-translate-y-0.5 hover:shadow-soft dark:border-brand-700/40 dark:bg-brand-900/20 dark:text-brand-200'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  s.done ? 'animate-pop bg-emerald-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600'
                }`}
              >
                {s.done && <CheckIcon width={14} height={14} />}
              </span>
              <span className={s.done ? 'line-through decoration-emerald-400/60' : ''}>
                {t(`growth.steps.${s.id}`)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function InviteCard({ growth }: { growth: Growth }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(growth.referral_code);
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Digital Card', text: t('growth.inviteShareText'), url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <section
      className="card relative overflow-hidden bg-linear-to-br from-brand-600 to-accent-600 text-white dark:from-brand-700 dark:to-accent-600"
      aria-labelledby="inv"
      data-testid="invite-card"
    >
      <div aria-hidden="true" className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
            <GiftIcon />
          </span>
          <div>
            <h2 id="inv" className="font-semibold">
              {t('growth.inviteTitle')}
            </h2>
            <p className="text-sm text-white/80">{t('growth.inviteBody')}</p>
            <p className="mt-1 text-xs text-white/70">
              {t('growth.inviteStats', { invited: growth.invited, rewarded: growth.rewarded })}
            </p>
          </div>
        </div>
        <button type="button" className="btn bg-white text-brand-700 hover:bg-brand-50" onClick={() => void share()}>
          {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
          {copied ? t('common.copied') : t('growth.inviteCta')}
        </button>
      </div>
    </section>
  );
}

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Builds an e-mail-client-safe HTML signature (tables + inline styles only). */
export function signatureHtml(c: Card): string {
  const name = escHtml(displayName({ firstName: c.first_name, lastName: c.last_name, nameFormat: 'full' }));
  const url = publicCardUrl(c.slug, 'email');
  const line = (v: string | null) => (v ? `${escHtml(v)}<br>` : '');
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0B1220;line-height:1.5">
<tr><td style="border-left:3px solid #2557E6;padding-left:12px">
<strong style="font-size:15px">${name}</strong><br>
<span style="color:#4B5563">${line([c.title, c.company].filter(Boolean).join(' · ') || null)}</span>
${line(c.phone)}${c.email ? `<a href="mailto:${escHtml(c.email)}" style="color:#2557E6;text-decoration:none">${escHtml(c.email)}</a><br>` : ''}
<a href="${escHtml(url)}" style="display:inline-block;margin-top:6px;padding:6px 12px;border-radius:8px;background:#2557E6;color:#ffffff;text-decoration:none;font-weight:bold">Digital Card →</a>
</td></tr></table>`;
}

export function EmailSignatureButton({ card }: { card: Card }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => signatureHtml(card), [card]);
  const copy = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([publicCardUrl(card.slug, 'email')], { type: 'text/plain' }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(html);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <>
      <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)}>
        <PenIcon width={14} height={14} /> {t('growth.signature')}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('growth.signatureTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{t('growth.signatureHelp')}</p>
          {/* HTML is generated from escaped card fields only (signatureHtml) */}
          <div
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <button type="button" className="btn-primary w-full" onClick={() => void copy()}>
            {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
            {copied ? t('common.copied') : t('growth.signatureCopy')}
          </button>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Icon name="mail" width={14} height={14} /> {t('growth.signatureWhere')}
          </p>
        </div>
      </Modal>
    </>
  );
}

export function Celebrate({ title, body }: { title: string; body: string }) {
  useEffect(() => burstConfetti(), []);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="grid h-14 w-14 animate-pop place-items-center rounded-2xl bg-linear-to-br from-brand-500 to-accent-500 text-white shadow-lift">
        <TrophyIcon width={28} height={28} />
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-slate-500">{body}</p>
    </div>
  );
}
