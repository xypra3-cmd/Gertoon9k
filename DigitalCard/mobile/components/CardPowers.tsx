// Home: «Wallet-д нэмэх» (Apple Wallet on iPhone, Google Wallet on Android) and «NFC-д бичих»
// (write the card link to an NFC sticker/card — any phone that taps it opens the card).
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { font } from '@/lib/fonts';
import { addToWallet, walletKind, WalletError } from '@/lib/wallet';
import { nfcAvailable, nfcCancelled, nfcEnabled, openNfcSettings, writeCardTag } from '@/lib/nfc';
import { syncWidgets } from '@/lib/widgets';
import type { WidgetCard } from '@/widgets/CardQrWidget';
import { haptic, Icon, PressScale } from './motion';
import { Notice, Txt } from './ui';
import type { IconName } from '@digitalcard/shared/icons';

function Tile({ icon, title, sub, onPress, busy }: { icon: IconName; title: string; sub: string; onPress: () => void; busy?: boolean }) {
  const th = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <PressScale accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ busy }} disabled={busy} onPress={onPress}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 60, borderRadius: 16, backgroundColor: th.card, borderWidth: 1, borderColor: th.border, opacity: busy ? 0.6 : 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: th.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={19} color={th.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={14} weight="700" numberOfLines={1}>
              {title}
            </Txt>
            <Txt muted size={12} numberOfLines={1} style={{ ...font('500') }}>
              {sub}
            </Txt>
          </View>
        </View>
      </PressScale>
    </View>
  );
}

export function CardPowers({ cardId, slug, url, widget }: { cardId: string; slug: string; url: string; widget: WidgetCard }) {
  const { t } = useI18n();
  const [nfc, setNfc] = useState(false);
  const [busy, setBusy] = useState<'wallet' | 'nfc' | null>(null);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // Home/lock-screen widgets always show the card currently on screen.
  const widgetKey = JSON.stringify(widget);
  useEffect(() => {
    void syncWidgets(JSON.parse(widgetKey) as WidgetCard);
  }, [widgetKey]);

  useEffect(() => {
    let alive = true;
    void nfcAvailable().then((ok) => alive && setNfc(ok));
    return () => {
      alive = false;
    };
  }, []);

  const wallet = async () => {
    setBusy('wallet');
    setMsg(null);
    try {
      await addToWallet(cardId, slug);
    } catch (e) {
      const code = e instanceof WalletError ? e.message : 'failed';
      setMsg({ tone: 'error', text: code === 'wallet_not_configured' ? t('m.walletNotConfigured') : t('m.walletFailed') });
    } finally {
      setBusy(null);
    }
  };

  const writeTag = async () => {
    if (!(await nfcEnabled())) {
      Alert.alert(t('m.nfcOffTitle'), t('m.nfcOffBody'), [
        { text: t('m.cancel'), style: 'cancel' },
        { text: t('m.openSettings'), onPress: () => void openNfcSettings() },
      ]);
      return;
    }
    setBusy('nfc');
    setMsg(null);
    try {
      await writeCardTag(url, t('m.nfcHold'), t('m.nfcWritten'));
      haptic.success();
      setMsg({ tone: 'success', text: t('m.nfcWritten') });
    } catch (e) {
      if (!nfcCancelled(e)) setMsg({ tone: 'error', text: t('m.nfcFailed') });
    } finally {
      setBusy(null);
    }
  };

  if (!walletKind && !nfc) return null;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {walletKind ? <Tile icon="wallet" title={t('m.wallet')} sub={walletKind === 'apple' ? 'Apple Wallet' : 'Google Wallet'} busy={busy === 'wallet'} onPress={() => void wallet()} /> : null}
        {nfc ? <Tile icon="nfc" title={t('m.nfcWrite')} sub={t('m.nfcSub')} busy={busy === 'nfc'} onPress={() => void writeTag()} /> : null}
      </View>
      {msg ? <Notice tone={msg.tone} text={msg.text} /> : null}
    </View>
  );
}
