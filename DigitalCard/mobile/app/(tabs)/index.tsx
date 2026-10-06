import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, Share, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Brightness from 'expo-brightness';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { displayName } from '@digitalcard/shared/format';
import { useAuth } from '@/lib/auth';
import { fromCardRow, ubToday, useContacts, useMyCards } from '@/lib/cards';
import { publicCardUrl } from '@/lib/env';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { Button, Card, Loading, Notice, Screen, Txt } from '@/components/ui';
import { GettingStarted } from '@/components/GettingStarted';
import { CardView } from '@/components/CardView';
import { FlipCard } from '@/components/FlipCard';
import { Appear, haptic, Icon, PressScale } from '@/components/motion';

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

function TodayFollowups() {
  const { t } = useI18n();
  const th = useTheme();
  const router = useRouter();
  const contacts = useContacts();
  const today = ubToday();
  const due = useMemo(() => (contacts.data?.rows ?? []).filter((c) => c.follow_up_at && c.follow_up_at <= today && c.status !== 'closed').slice(0, 5), [contacts.data, today]);
  if (due.length === 0) return null;
  return (
    <Appear index={2}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" color={th.primary} size={18} />
          <Txt weight="700">{t('m.todayFollowups', { n: due.length })}</Txt>
        </View>
        {due.map((c) => (
          <PressScale key={c.id} accessibilityRole="button" accessibilityLabel={c.name} onPress={() => router.push(`/contact/${c.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: th.border }}>
              <View style={{ flex: 1 }}>
                <Txt weight="600">{c.name}</Txt>
                {c.company ? (
                  <Txt muted size={13}>
                    {c.company}
                  </Txt>
                ) : null}
              </View>
              <Txt size={13} style={{ color: c.follow_up_at! < today ? th.danger : th.primary }}>
                {c.follow_up_at! < today ? t('contacts.overdue') : t('m.today')}
              </Txt>
            </View>
          </PressScale>
        ))}
      </Card>
    </Appear>
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
  const all = cards.data ?? [];
  const published = all.filter((c) => c.is_published);

  if (published.length === 0) {
    const draft = all[0];
    return (
      <Screen>
        <Appear>
          <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: th.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkles" color={th.primary} size={30} />
            </View>
            <Txt size={22} weight="700" style={{ textAlign: 'center' }}>
              {draft ? t('m.publishTitle') : t('welcome.heroTitle')}
            </Txt>
            <Txt muted style={{ textAlign: 'center' }}>
              {draft ? t('m.publishBody') : t('welcome.heroBody')}
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <Button title={draft ? t('m.editCard') : t('welcome.heroCta')} onPress={() => router.push(draft ? `/edit/${draft.id}` : '/welcome')} />
            </View>
          </Card>
        </Appear>
        <GettingStarted />
      </Screen>
    );
  }

  const card = published[Math.min(index, published.length - 1)]!;
  const url = publicCardUrl(card.slug);
  const qrSize = Math.min(width - 112, 280);
  const editable = entitlements?.editable_card_ids.includes(card.id) ?? false;
  const name = displayName({ firstName: card.first_name, lastName: card.last_name, nameFormat: card.name_format as 'initial' | 'full' });
  const data = fromCardRow(card, card.card_links ?? []);

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
              onPress={() => {
                haptic.tap();
                setIndex(i);
              }}
              style={{
                paddingHorizontal: 14,
                minHeight: 40,
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: i === index ? th.primary : th.card,
                borderWidth: 1,
                borderColor: i === index ? th.primary : th.border,
              }}
            >
              <Txt size={14} weight="600" style={{ color: i === index ? th.onPrimary : th.text }}>
                /{c.slug}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
      <Appear key={card.id}>
        <FlipCard
          label={t('m.flipHint')}
          front={(backHeight) => (
            <Card style={{ alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: backHeight }}>
              <Txt size={22} weight="700">
                {name}
              </Txt>
              {card.title ? <Txt muted>{card.title}</Txt> : null}
              <View accessible accessibilityLabel={`QR: ${url}`} style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20 }}>
                <QRCode value={publicCardUrl(card.slug, 'qr')} size={qrSize} ecl="M" />
              </View>
              <Txt muted size={13} selectable>
                {url}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="refresh" color={th.muted} size={14} />
                <Txt muted size={12}>
                  {t('m.flipHint')}
                </Txt>
              </View>
            </Card>
          )}
          back={<CardView data={data} interactive={false} />}
        />
      </Appear>
      <PressScale accessibilityRole="button" accessibilityLabel={t('nearby.title')} onPress={() => router.push('/nearby')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: th.primarySoft }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: th.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="nearby" color={th.onPrimary} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="700">{t('nearby.title')}</Txt>
            <Txt muted size={13}>
              {t('nearby.homeHint')}
            </Txt>
          </View>
          <Icon name="chevronRight" color={th.primary} size={18} />
        </View>
      </PressScale>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title={t('common.share')} icon={<Icon name="share" color={th.onPrimary} size={18} />} onPress={() => void Share.share({ message: url, url })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={copied ? t('common.copied') : t('common.copyLink')}
            variant="secondary"
            icon={<Icon name={copied ? 'check' : 'copy'} color={th.text} size={18} />}
            onPress={async () => {
              await Clipboard.setStringAsync(url);
              haptic.success();
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          />
        </View>
      </View>
      {editable ? (
        <Button title={t('m.editCard')} variant="secondary" icon={<Icon name="pen" color={th.text} size={18} />} onPress={() => router.push(`/edit/${card.id}`)} />
      ) : (
        <Notice text={t('m.noEditRights')} />
      )}
      <TodayFollowups />
      <GettingStarted />
    </Screen>
  );
}
