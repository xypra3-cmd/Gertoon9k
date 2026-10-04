import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { displayName, getTemplate } from '@digitalcard/shared';
import { useCard } from '@/lib/queries';
import { fromCard } from '@/lib/cardData';
import { publicCardUrl } from '@/lib/env';
import { downloadBlob } from '@/lib/download';
import { A4, a4Origin, cropToTrim, drawA4Marks, drawCornerMarks, MM, mmToCssPx, PIXEL_RATIO } from '@/lib/print';
import { useI18n } from '@/i18n/I18nProvider';
import { useErrorText } from '@/lib/useErrorText';
import { QrCode } from '@/components/QrCode';
import { Banner, Spinner } from '@/components/ui';
import { Avatar } from '@/templates/parts';

const mm = (v: number) => `${mmToCssPx(v)}px`;

export default function CardPrint() {
  const { id } = useParams();
  const { t } = useI18n();
  const errorText = useErrorText();
  const card = useCard(id);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (card.isLoading) return <Spinner />;
  if (!card.data) return <Banner tone="error">{errorText(card.error)}</Banner>;

  const data = fromCard(card.data, card.data.card_links, card.data.organizations);
  const colors = getTemplate(data.templateId).colors[data.colorScheme];
  const accent = data.brandColor ?? colors.accent;
  const url = publicCardUrl(data.slug, 'qr');
  const name = displayName(data);

  const render = async (el: HTMLElement) => {
    const { toPng } = await import('html-to-image');
    return toPng(el, { pixelRatio: PIXEL_RATIO, cacheBust: true, backgroundColor: colors.bg });
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const png = (side: 'front' | 'back') =>
    run(async () => {
      const dataUrl = await render((side === 'front' ? frontRef : backRef).current!);
      downloadBlob(await (await fetch(dataUrl)).blob(), `${data.slug}-${side}-96x61mm-300dpi.png`);
    });

  const pdf = () =>
    run(async () => {
      const { jsPDF } = await import('jspdf');
      const [front, back] = [await render(frontRef.current!), await render(backRef.current!)];
      const doc = new jsPDF({ unit: 'mm', format: [MM.fullW, MM.fullH], orientation: 'landscape' });
      doc.addImage(front, 'PNG', 0, 0, MM.fullW, MM.fullH);
      drawCornerMarks(doc);
      doc.addPage([MM.fullW, MM.fullH], 'landscape');
      doc.addImage(back, 'PNG', 0, 0, MM.fullW, MM.fullH);
      drawCornerMarks(doc);
      doc.setProperties({ title: `${name} — Digital Card`, creator: 'Digital Card' });
      downloadBlob(doc.output('blob'), `${data.slug}-print-96x61mm.pdf`);
    });

  const a4 = () =>
    run(async () => {
      const { jsPDF } = await import('jspdf');
      const front = await cropToTrim(await render(frontRef.current!));
      const back = await cropToTrim(await render(backRef.current!));
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const { x, y } = a4Origin();
      const place = (img: string, mirror: boolean) => {
        for (let r = 0; r < A4.rows; r++)
          for (let c = 0; c < A4.cols; c++) {
            const col = mirror ? A4.cols - 1 - c : c; // duplex: backs mirrored horizontally
            doc.addImage(img, 'PNG', x + col * MM.trimW, y + r * MM.trimH, MM.trimW, MM.trimH);
          }
        drawA4Marks(doc);
      };
      place(front, false);
      doc.addPage('a4', 'portrait');
      place(back, true);
      downloadBlob(doc.output('blob'), `${data.slug}-a4-10up.pdf`);
    });

  const safe = MM.bleed + 4; // 4 mm safe margin inside trim
  const frame = { width: mm(MM.fullW), height: mm(MM.fullH), fontFamily: '"Inter Variable", Inter, sans-serif' };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('print.title')}</h1>
        <Link to={`/app/cards/${card.data.id}`} className="btn-ghost btn-sm">
          {t('common.back')}
        </Link>
      </div>
      <p className="text-sm text-slate-500">{t('print.info')}</p>
      {error && <Banner tone="error">{error}</Banner>}

      <div className="flex flex-wrap gap-6 overflow-x-auto">
        <figure>
          <figcaption className="mb-2 text-sm font-medium">{t('print.front')}</figcaption>
          <div
            ref={frontRef}
            data-testid="print-front"
            style={{ ...frame, background: colors.bg, color: colors.fg, position: 'relative', overflow: 'hidden' }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: mm(MM.bleed + 2.5),
                background: accent,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: mm(safe + 1),
                top: mm(safe),
                right: mm(safe),
                bottom: mm(safe),
                display: 'flex',
                gap: mm(3),
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: mm(name.length > 22 ? 4.2 : 5.2),
                      fontWeight: 700,
                      lineHeight: 1.15,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {name}
                  </div>
                  {data.title && (
                    <div style={{ fontSize: mm(2.9), color: accent, fontWeight: 600, marginTop: mm(0.8) }}>
                      {data.title}
                    </div>
                  )}
                  {data.company && (
                    <div style={{ fontSize: mm(2.7), color: colors.muted, marginTop: mm(0.4) }}>{data.company}</div>
                  )}
                </div>
                <div style={{ fontSize: mm(2.5), lineHeight: 1.45 }}>
                  {data.phone && <div>{data.phone}</div>}
                  {data.email && <div>{data.email}</div>}
                  {data.website && <div>{data.website.replace(/^https:\/\//, '')}</div>}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                }}
              >
                {data.logoUrl ? (
                  <img
                    src={data.logoUrl}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ maxHeight: mm(9), maxWidth: mm(22), objectFit: 'contain' }}
                  />
                ) : (
                  <Avatar data={{ ...data, avatarUrl: null }} size={mmToCssPx(11)} colors={{ ...colors, accent }} />
                )}
              </div>
            </div>
          </div>
        </figure>

        <figure>
          <figcaption className="mb-2 text-sm font-medium">{t('print.back')}</figcaption>
          <div
            ref={backRef}
            data-testid="print-back"
            style={{
              ...frame,
              background: accent,
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: mm(5),
            }}
          >
            <div style={{ background: '#FFFFFF', padding: mm(1.5), borderRadius: mm(1.5) }}>
              {/* 24 mm QR (≥ 18 mm requirement) */}
              <QrCode value={url} size={mmToCssPx(24)} title={url} />
            </div>
            <div style={{ maxWidth: mm(40) }}>
              <div style={{ fontSize: mm(3.6), fontWeight: 700, lineHeight: 1.2 }}>{data.company || name}</div>
              <div style={{ fontSize: mm(2.3), marginTop: mm(1.5), opacity: 0.9, overflowWrap: 'anywhere' }}>
                {publicCardUrl(data.slug).replace(/^https?:\/\//, '')}
              </div>
            </div>
          </div>
        </figure>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void png('front')}>
          {t('print.png')} — {t('print.front')}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void png('back')}>
          {t('print.png')} — {t('print.back')}
        </button>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void pdf()}>
          {t('print.pdf')}
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void a4()}>
          {t('print.a4')}
        </button>
      </div>
      <p className="text-xs text-slate-500">{t('print.bleed')}</p>
    </div>
  );
}
