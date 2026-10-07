// «Wallet-д нэмэх»: the card as an Apple Wallet pass or a Google Wallet pass (QR on the lock screen).
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { functionsUrl, env } from '@/lib/env';
import { useI18n } from '@/i18n/I18nProvider';
import { Icon } from './icons';

type Kind = 'apple' | 'google';

async function requestPass(cardId: string, kind: Kind): Promise<{ blob?: Blob; url?: string; error?: string }> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${functionsUrl}/wallet-pass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ card_id: cardId, kind }),
  });
  if (!res.ok) return { error: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'unknown' };
  if (kind === 'apple') return { blob: await res.blob() };
  return { url: ((await res.json()) as { url: string }).url };
}

export function WalletButton({ cardId, slug }: { cardId: string; slug: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async (kind: Kind) => {
    setBusy(kind);
    setError(null);
    const r = await requestPass(cardId, kind);
    setBusy(null);
    if (r.error) return setError(r.error === 'wallet_not_configured' ? t('wallet.notConfigured') : t('wallet.failed'));
    if (r.url) window.open(r.url, '_blank', 'noopener');
    if (r.blob) {
      // Safari on iPhone / Mac opens .pkpass straight into «Add to Apple Wallet».
      const href = URL.createObjectURL(r.blob);
      const a = Object.assign(document.createElement('a'), { href, download: `${slug}.pkpass` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    }
  };

  return (
    <details className="group open:basis-full" data-testid="wallet">
      <summary className="btn-ghost btn-sm cursor-pointer list-none">
        <Icon name="wallet" width={14} height={14} /> {t('wallet.add')}
      </summary>
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
        {(['apple', 'google'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="btn-secondary btn-sm"
            disabled={!!busy}
            onClick={() => void add(k)}
          >
            {busy === k ? '…' : k === 'apple' ? 'Apple Wallet' : 'Google Wallet'}
          </button>
        ))}
        {error && (
          <p role="alert" className="basis-full px-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
