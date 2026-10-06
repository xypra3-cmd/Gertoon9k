import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { buildVCard, vcardFileName, VCARD_MIME } from '@digitalcard/shared/vcard';
import { displayName } from '@digitalcard/shared/format';
import type { CardData } from '@digitalcard/shared/types';
import { CardRenderer } from '@/templates';
import { fetchPublicCard, storedAccessToken, trackEvent } from '@/lib/publicApi';
import { fromPublicCard } from '@/lib/cardData';
import { publicCardUrl } from '@/lib/env';
import { downloadText } from '@/lib/download';
import { useI18n } from '@/i18n/I18nProvider';
import { DownloadIcon, MailIcon, PhoneIcon, SendIcon, ShareIcon, UserPlusIcon } from '@/components/icons';
import { Banner, Modal, Spinner } from '@/components/ui';
const ExchangeForm = lazy(() => import('@/components/ExchangeForm'));
const QrCode = lazy(() => import('@/components/QrCode').then((m) => ({ default: m.QrCode })));
import { FlipCard } from '@/components/FlipCard';
import { Icon } from '@/components/icons';
import { LanguageSwitch } from '@/components/LanguageSwitch';

function setMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function jwtSub(token: string): string | null {
  try {
    return JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))).sub ?? null;
  } catch {
    return null;
  }
}

export default function PublicCardPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const { t } = useI18n();
  const embed = params.get('embed') === '1';
  const fromQr = params.get('src') === 'qr';

  const [state, setState] = useState<{
    loading: boolean;
    data: CardData | null;
    id: string | null;
    branding?: boolean;
  }>({
    loading: true,
    data: null,
    id: null,
  });
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [turns, setTurns] = useState(0);
  const flipped = Math.abs(turns) % 2 === 1;

  useEffect(() => {
    let alive = true;
    fetchPublicCard(slug)
      .then((row) => {
        if (!alive) return;
        setState({
          loading: false,
          data: row ? fromPublicCard(row) : null,
          id: row?.id ?? null,
          branding: !!row?.show_branding,
        });
        if (row && !embed) trackEvent(slug, fromQr ? 'qr_open' : 'view');
      })
      .catch(() => alive && setState({ loading: false, data: null, id: null }));
    return () => {
      alive = false;
    };
  }, [slug, embed, fromQr]);

  const data = state.data;
  const name = data ? displayName(data) : '';

  useEffect(() => {
    if (!data) return;
    document.title = `${name}${data.title ? ` — ${data.title}` : ''} | Digital Card`;
    setMeta('og:title', name);
    setMeta('og:description', [data.title, data.company].filter(Boolean).join(' · '));
    if (data.avatarUrl) setMeta('og:image', data.avatarUrl);
  }, [data, name]);

  const vcf = useMemo(() => (data ? buildVCard({ ...data, publicUrl: publicCardUrl(data.slug) }) : ''), [data]);

  if (state.loading) return <Spinner />;
  if (!data) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">{t('errors.not_found')}</h1>
        <Link to="/" className="btn-secondary mt-6">
          Digital Card
        </Link>
      </div>
    );
  }

  const saveVcf = () => {
    downloadText(vcf, vcardFileName(data.slug), VCARD_MIME);
    if (!embed) trackEvent(slug, 'contact_save');
  };

  const share = async () => {
    const url = publicCardUrl(data.slug);
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice({ tone: 'success', text: t('common.copied') });
      }
    } catch {
      /* user cancelled */
    }
  };

  const token = storedAccessToken();
  const addToMine = async () => {
    if (!token || !state.id) return;
    const { supabase } = await import('@/lib/supabase');
    const owner = jwtSub(token);
    const { error } = await supabase.from('contacts').insert({
      owner_id: owner!,
      card_id: state.id,
      name: name.slice(0, 120),
      title: data.title,
      company: data.company,
      phone: data.phone,
      email: data.email,
      website: data.website,
      source: fromQr ? 'qr' : 'manual',
    });
    const { errorKey } = await import('@digitalcard/shared/errors');
    setNotice(
      error ? { tone: 'error', text: t(errorKey(error)) } : { tone: 'success', text: t('card.addedToContacts') },
    );
  };

  const actionBtn =
    'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold leading-tight';
  const tel = data.phone?.replace(/[^0-9+]/g, '');
  const actions = embed ? null : (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {tel && (
          <a href={`tel:${tel}`} className={`${actionBtn} bg-emerald-700 text-white`}>
            <PhoneIcon />
            {t('card.call')}
          </a>
        )}
        {data.email && (
          <a href={`mailto:${data.email}`} className={`${actionBtn} bg-sky-700 text-white`}>
            <MailIcon />
            {t('card.sendEmail')}
          </a>
        )}
        <button type="button" onClick={saveVcf} className={`${actionBtn} bg-slate-900 text-white`}>
          <DownloadIcon />
          {t('card.saveToPhone')}
        </button>
        <button type="button" onClick={() => void share()} className={`${actionBtn} bg-slate-200 text-slate-900`}>
          <ShareIcon />
          {t('common.share')}
        </button>
      </div>
      <button type="button" onClick={() => setExchangeOpen(true)} className="btn-primary w-full">
        <SendIcon />
        {t('card.leaveMyDetails')}
      </button>
      {token && (
        <button type="button" onClick={() => void addToMine()} className="btn-secondary w-full">
          <UserPlusIcon />
          {t('card.addToMyContacts')}
        </button>
      )}
    </div>
  );

  return (
    <main className={embed ? 'p-2' : 'min-h-screen bg-slate-100 px-3 py-4 dark:bg-slate-950 sm:py-10'}>
      {!embed && (
        <div className="mx-auto mb-3 flex max-w-[440px] items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setTurns((n) => n + 1)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
            aria-pressed={flipped}
            data-testid="flip-button"
          >
            <Icon name={flipped ? 'refresh' : 'qr'} className="h-4 w-4" />
            {flipped ? t('card.flipToCard') : t('card.flipToQr')}
          </button>
          <LanguageSwitch />
        </div>
      )}
      {notice && (
        <div className="mx-auto mb-3 max-w-[440px]">
          <Banner tone={notice.tone}>{notice.text}</Banner>
        </div>
      )}
      {embed ? (
        <CardRenderer data={data} actions={actions} onLinkClick={() => undefined} />
      ) : (
        <FlipCard
          turns={turns}
          onTurn={setTurns}
          front={
            <CardRenderer data={data} actions={actions} onLinkClick={(kind) => trackEvent(slug, 'link_click', kind)} />
          }
          back={
            <div className="mx-auto flex h-full max-w-[440px] flex-col items-center justify-center gap-4 rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{name}</p>
              {data.title && <p className="-mt-3 text-slate-600 dark:text-slate-300">{data.title}</p>}
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                {turns !== 0 && (
                  <Suspense fallback={<div className="h-[240px] w-[240px]" />}>
                    <QrCode
                      value={publicCardUrl(data.slug, 'qr')}
                      size={240}
                      title={`QR: ${publicCardUrl(data.slug)}`}
                    />
                  </Suspense>
                )}
              </div>
              <p className="break-all text-sm text-slate-600 dark:text-slate-400">{publicCardUrl(data.slug)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('card.scanToSave')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('card.flipHint')}</p>
            </div>
          }
        />
      )}
      {!embed &&
        (state.branding ? (
          <div className="mx-auto mt-6 max-w-[440px] animate-fade-up [animation-delay:400ms]">
            <Link
              to="/?utm_source=card&utm_medium=footer"
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              data-testid="made-with"
            >
              <span className="text-slate-600 dark:text-slate-300">{t('card.madeWith')}</span>
              <span className="font-semibold text-brand-700 dark:text-brand-200">{t('card.createYours')} →</span>
            </Link>
          </div>
        ) : (
          <p className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            <Link to="/" className="hover:underline">
              Digital Card
            </Link>
          </p>
        ))}

      <Modal open={exchangeOpen} onClose={() => setExchangeOpen(false)} title={t('exchange.title')}>
        {sentTo !== null ? (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold">{t('exchange.sent', { name: sentTo || name })}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('exchange.saveOwnerCard', { name })}</p>
            <button type="button" className="btn-primary w-full" onClick={saveVcf}>
              <DownloadIcon />
              {t('card.saveToPhone')}
            </button>
          </div>
        ) : (
          <Suspense fallback={<Spinner />}>
            <ExchangeForm slug={data.slug} onDone={(owner) => setSentTo(owner)} />
          </Suspense>
        )}
      </Modal>
    </main>
  );
}
