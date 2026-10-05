import { useCallback, useState } from 'react';
import { Platform, Pressable, Share, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Brightness from 'expo-brightness';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';
import { displayName } from '@digitalcard/shared/format';
import { useAuth } from '@/lib/auth';
import { useMyCards } from '@/lib/cards';
import { publicCardUrl } from '@/lib/env';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button, Card, Loading, Notice, Screen, Txt } from '@/components/ui';
import { GettingStarted } from '@/components/GettingStarted';
import { Appear, haptic } from '@/components/motion';

/** Raise screen brightness while the QR is visible; restore on leave (helps scanners in daylight). */
function useQrBrightness() {
  useFocusEffect(
    useCallback(() => {
      let previous: number | null = null;
      let active = true;
      (async () => {
        try {
          if (!(await Brightness.isAvailableAsync())) return;
          previous = await Brightness.getBrightnessAsync();
          if (active) await Brightness.setBrightnessAsync(1);
        } catch {
          /* not supported (simulator) */
        }
      })();
      return () => {
        active = false;
        if (Platform.OS === 'android') void Brightness.restoreSystemBrightnessAsync().catch(() => undefined);
        else if (previous !== null) void Brightness.setBrightnessAsync(previous).catch(() => undefined);
      };
    }, []),
  );
}

export default function MyCard() {
  const { t } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const { entitlements } = useAuth();
  const cards = useMyCards();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  useQrBrightness();

  if (cards.isLoading) return <Loading />;
  const published = (cards.data ?? []).filter((c) => c.is_published);
  if (published.length === 0) {
    return (
      <Screen>
        <Notice text={t('m.noCard')} />
        <GettingStarted />
      </Screen>
    );
  }
  const card = published[Math.min(index, published.length - 1)]!;
  const url = publicCardUrl(card.slug);
  const qrSize = Math.min(width - 96, 320);
  const editable = entitlements?.editable_card_ids.includes(card.id) ?? false;
  const name = displayName({
    firstName: card.first_name,
    lastName: card.last_name,
    nameFormat: card.name_format as 'initial' | 'full',
  });

  return (
    <Screen>
      {published.length > 1 && (
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {published.map((c, i) => (
            <Pressable
              key={c.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`${t('m.switchCard')}: ${c.slug}`}
              onPress={() => setIndex(i)}
              style={{
                paddingHorizontal: 12,
                minHeight: 40,
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: i === index ? th.primary : th.card,
                borderWidth: 1,
                borderColor: th.border,
              }}
            >
              <Txt size={14} style={{ color: i === index ? th.onPrimary : th.text }}>
                /{c.slug}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
      <Appear>
        <Card style={{ alignItems: 'center', gap: 12 }}>
          <Txt size={22} weight="700">
            {name}
          </Txt>
          {card.title ? <Txt muted>{card.title}</Txt> : null}
          <View
            accessible
            accessibilityLabel={`QR: ${url}`}
            style={{
              backgroundColor: '#FFFFFF',
              padding: 16,
              borderRadius: 16,
            }}
          >
            <QRCode value={publicCardUrl(card.slug, 'qr')} size={qrSize} ecl="M" />
          </View>
          <Txt muted size={13} selectable>
            {url}
          </Txt>
          <Txt muted size={12}>
            {t('m.brightness')}
          </Txt>
        </Card>
      </Appear>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title={t('common.share')} onPress={() => void Share.share({ message: url, url })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={copied ? t('common.copied') : t('common.copyLink')}
            variant="secondary"
            onPress={async () => {
              await Clipboard.setStringAsync(url);
              haptic.success();
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          />
        </View>
      </View>
      <GettingStarted />
      {editable ? <Button title={t('m.editCard')} variant="secondary" onPress={() => router.push(`/edit/${card.id}`)} /> : <Notice text={t('m.noEditRights')} />}
      {/* Preview renders the real web template (no duplicated template code in the app). */}
      <View
        style={{
          height: 560,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: th.border,
        }}
      >
        <WebView source={{ uri: `${url}?embed=1` }} originWhitelist={['https://*', 'http://*']} setSupportMultipleWindows={false} accessibilityLabel={t('m.preview')} />
      </View>
    </Screen>
  );
}
